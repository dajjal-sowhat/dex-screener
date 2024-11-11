import JsonEditor from "@/JsonEditor.tsx";
import {useState} from "react";
import {Button} from "@/components/ui/button.tsx";

function PairEditor(props: {
	object: any
}) {
	let {object: defaultObject} = props;
	const [object, setObject] = useState(defaultObject);


	return (
		<div className={'relative'}>
			<h1 className="text-2xl font-bold mb-4">{object?.pair?.baseToken?.symbol}</h1>
			<JsonEditor onChange={setObject} initialData={object?.pair || {}}/>
			<div className={'sticky bottom-0 p-2 w-full bg-gray-400 shadow drop-shadow h-full left-0'}>
				<Button onClick={()=>{
					fetch("/set-override", {
						method: "POST",
						body: JSON.stringify({
							addresses: defaultObject.addresses,
							pair: object
						})
					}).then(()=>{
						alert("SAVED");
					}).catch(e=>alert(e?.message ?? e));
				}} className={'mx-auto block'}>
					Save
				</Button>
			</div>
		</div>
	);
}

export default PairEditor;
