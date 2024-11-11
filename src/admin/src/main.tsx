import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import PairEditor from "@/PairEditor.tsx";

const params = new URLSearchParams(window.location.search);
const object = JSON.parse(window.localStorage.getItem(params.get('address')+"")+"");

createRoot(document.getElementById('root')!).render(
	<StrictMode>
			<main className="container mx-auto p-4 relative">
				<PairEditor object={object} />
			</main>
	</StrictMode>,
)
