import { useState, useRef, useEffect } from 'react';
import { FileDown, Copy, Trash2, FileText, Code, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import TurndownService from 'turndown';
import './App.css'; // Import the CSS file

export default function App() {
  const [markdownOutput, setMarkdownOutput] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'copied' | 'error' | 'no-selection' | 'dev-mode' | 'copy-failed'>('idle');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // ... [Keep detectLanguage function exactly as is] ...
  const detectLanguage = (code: string): string => {
    const trimmed = code.trim();
    if (!trimmed) return 'text';
    const firstLine = trimmed.split('\n')[0].trim();
    
    if (firstLine.startsWith('$') || /^(npm|npx|yarn|pnpm|cd|ls|git|docker|curl|wget|brew|sudo|apt|yum|echo|cat|grep|pip|python|node)\b/.test(firstLine)) return 'shell';
    if (/^(import|export|const|let|var|function|class|async|interface|type)\b/.test(firstLine) || trimmed.includes('console.log') || trimmed.includes('=>') || trimmed.includes('document.getElementById')) return 'javascript';
    if (/^(def|class|import|from|if __name__)\b/.test(firstLine) || (firstLine.includes(':') && !firstLine.includes('{') && !firstLine.includes(';'))) return 'python';
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return 'html';
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'json';
    if (trimmed.includes('{') && /^(body|div|span|h[1-6]|#|\.)/.test(firstLine)) return 'css';
    return 'shell';
  };

  // ... [Keep convertToMarkdown function exactly as is] ...
  const convertToMarkdown = (html: string) => {
    const turndownService = new TurndownService({
      headingStyle: 'atx', hr: '---', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**',
    });

    turndownService.addRule('fencedCodeBlock', {
      filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
      replacement: (_content, node) => {
        const element = node as HTMLElement;
        const codeElement = element.firstChild as HTMLElement;
        const rawCode = codeElement.textContent || '';
        const classSource = codeElement.className || element.className || '';
        const match = classSource.match(/(?:language-|lang-)(\w+)/);
        let lang = match ? match[1] : '';
        if (!lang) lang = detectLanguage(rawCode);
        return `\n\n\`\`\`${lang}\n${rawCode.trim()}\n\`\`\`\n\n`;
      }
    });

    turndownService.addRule('listSpacing', {
      filter: ['ul', 'ol'],
      replacement: (content, node) => {
        const parent = node.parentNode;
        const isNested = parent && (parent.nodeName === 'LI' || parent.nodeName === 'OL' || parent.nodeName === 'UL');
        const cleanContent = content.split('\n').map(line => line.trimEnd()).join('\n').trim();
        if (isNested) return `\n${cleanContent}\n`; 
        return `\n\n${cleanContent}\n\n`;
      }
    });

    turndownService.addRule('emphasisHeading', {
      filter: 'p',
      replacement: (content) => {
        const trimmed = content.trim();
        if (/^\*\*[^*]+\*\*$/.test(trimmed) && trimmed.length < 100) {
           return `\n\n### ${trimmed.slice(2, -2)}\n\n`;
        }
        return '\n\n' + trimmed + '\n\n';
      }
    });

    let md = turndownService.turndown(html);
    md = md.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
    return md.trim() + '\n';
  };

  // ... [Keep useEffect and handlers exactly as is] ...
  useEffect(() => {
    const autoLoadSelection = async () => {
      const chrome = (window as any).chrome;
      if (!chrome || !chrome.tabs || !chrome.scripting) {
        setStatus('dev-mode');
        return;
      }
      try {
        setStatus('scanning');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) { setStatus('idle'); return; }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
             const selection = window.getSelection();
             if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
               const container = document.createElement("div");
               container.appendChild(selection.getRangeAt(0).cloneContents());
               return container.innerHTML;
             }
             return null;
          }
        });

        const html = results[0]?.result;
        if (html) {
           if (editorRef.current) { editorRef.current.innerHTML = html; editorRef.current.scrollTop = 0; }
           const md = convertToMarkdown(html);
           setMarkdownOutput(md);
           if (outputRef.current) outputRef.current.scrollTop = 0;
           try {
             await navigator.clipboard.writeText(md);
             setStatus('copied');
             setTimeout(() => setStatus('idle'), 3000);
           } catch (clipboardError) {
             console.warn("Auto-copy failed", clipboardError);
             setStatus('copy-failed');
           }
        } else {
           setStatus('no-selection');
        }
      } catch (e) {
        console.error("Auto-load failed", e);
        setStatus('error');
      }
    };
    autoLoadSelection();
  }, []);

  const handleInput = () => {
    if (editorRef.current) setMarkdownOutput(convertToMarkdown(editorRef.current.innerHTML));
  };

  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([markdownOutput], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = 'converted_canvas.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdownOutput);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error("Copy failed", e);
      setStatus('error');
    }
  };

  const clearAll = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setMarkdownOutput('');
    setStatus('idle');
  };

  return (
    <div className="container">
      <header className="header">
        <div className="title-group">
          <div className="icon-box">
            <FileText size={16} color="white" />
          </div>
          <div className="title-text">
            <h1>Canvas 2 MD</h1>
            <div className="status">
              {status === 'scanning' && <><Loader2 size={12} className="animate-spin" color="#4f46e5" /> <span style={{color:'#4f46e5'}}>Scanning...</span></>}
              {status === 'copied' && <><CheckCircle size={12} color="#16a34a" /> <span style={{color:'#16a34a', fontWeight: 'bold'}}>Copied!</span></>}
              {status === 'copy-failed' && <><AlertCircle size={12} color="#ea580c" /> <span style={{color:'#ea580c', fontWeight: 'bold'}}>Text ready (Click Copy)</span></>}
              {status === 'idle' && <span style={{color:'#94a3b8'}}>Ready</span>}
              {status === 'no-selection' && <><AlertCircle size={12} color="#d97706" /> <span style={{color:'#d97706'}}>Select text first</span></>}
              {status === 'dev-mode' && <span style={{fontStyle:'italic', color:'#94a3b8'}}>Dev Mode</span>}
              {status === 'error' && <><AlertCircle size={12} color="#ef4444" /> <span style={{color:'#ef4444'}}>Error</span></>}
            </div>
          </div>
        </div>
        
        <div className="button-group">
          <button onClick={clearAll} className="icon-btn" title="Clear All">
            <Trash2 size={16} />
          </button>
          <button onClick={downloadMarkdown} disabled={!markdownOutput} className="primary-btn">
            <FileDown size={14} />
            Save .md
          </button>
        </div>
      </header>

      <main className="main">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <span style={{width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6366f1'}}></span>
              Source
            </span>
          </div>
          <div 
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="editor"
            data-placeholder="Select text on page..."
          />
        </div>

        <div className="panel dark">
          <div className="panel-header">
            <span className="panel-title">
              <Code size={12} />
              Markdown
            </span>
            <button onClick={copyToClipboard} className="copy-btn">
              <Copy size={12} />
              {status === 'copied' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea 
            ref={outputRef}
            value={markdownOutput}
            onChange={(e) => setMarkdownOutput(e.target.value)}
            className="editor dark"
            placeholder="Markdown output..."
            spellCheck={false}
          />
        </div>
      </main>
    </div>
  );
}