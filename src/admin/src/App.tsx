import {useEffect, useRef, useState} from "react";

function App() {
	const [messages, setMessages] = useState<any[]>([]);
	const iframe = useRef<HTMLIFrameElement>();

	useEffect(() => {
		if (!iframe) return;

		const event = (e: MessageEvent)=>{
			if (!e.data.dex) return;
			setMessages(pre => [...pre,e.data])
		}

		window?.addEventListener('message',event);
	}, [iframe]);

	return (
		<div className={'w-full container mx-auto'}>
			{messages.map(o=><p>{JSON.stringify(o)}</p>)}
			<div className={''}>
				<input onKeyDown={e => {
					if (e.key === 'Enter' && 'value' in e.target) {
						(iframe.current ? iframe.current?.contentWindow?.window:window.parent)?.postMessage(JSON.parse(e.target.value+""));
						e.target.value = ""
					}
				}} />
				{!window.location.href.includes("iframe") && <iframe ref={iframe as any} src={window.location.href+"/iframe"} />}
			</div>

		</div>
	)
}

export default App
