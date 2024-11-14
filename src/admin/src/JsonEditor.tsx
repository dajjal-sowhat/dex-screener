import React, {useState, useEffect} from 'react';
import {ChevronDown, ChevronRight, Trash2, Plus} from 'lucide-react';
import {Card, CardContent} from './components/ui/card';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './components/ui/select';
import {Textarea} from './components/ui/textarea';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonEditorProps {
	initialData?: { [key: string]: JsonValue };
	onChange?: (changes: { [key: string]: JsonValue }) => void;
	changes?: any
}

const JsonEditor: React.FC<JsonEditorProps> = ({initialData = {}, onChange, changes: initChanges = {}}) => {
	const [data, setData] = useState<{ [key: string]: JsonValue }>(initialData);
	const [_, setChanges] = useState<{ [key: string]: JsonValue }>(initChanges);
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([""]));
	const [rawJson, setRawJson] = useState<string>(JSON.stringify(data, null, 2));
	const [jsonError, setJsonError] = useState<string>('');

	// Reset data when initialData changes
	useEffect(() => {
		setData(initialData);
		setRawJson(JSON.stringify(initialData, null, 2));
		setChanges(initChanges);
	}, [initialData]);

	const setValueByPath = (obj: any, path: string, value: any): any => {
		const parts = path.split('.');
		const key = parts[0];

		if (parts.length === 1) {
			return { ...obj, [key]: value };
		}

		return {
			...obj,
			[key]: setValueByPath(
				obj[key] || {},
				parts.slice(1).join('.'),
				value
			)
		};
	};

	const getValueByPath = (obj: any, path: string): any => {
		return path.split('.').reduce((acc, part) => {
			return acc && typeof acc === 'object' ? acc[part] : undefined;
		}, obj);
	};

	const deleteValueByPath = (obj: any, path: string): any => {
		const copy = { ...obj };
		const parts = path.split('.');
		const key = parts.pop()!;
		const parent = parts.reduce((acc, part) => acc[part], copy);
		if (parent && typeof parent === 'object') {
			delete parent[key];
		}
		return copy;
	};

	const updateChanges = (path: string, value: JsonValue) => {
		const originalValue = getValueByPath(initialData, path);

		if (JSON.stringify(originalValue) !== JSON.stringify(value)) {
			// Value is different from initial - track the change
			setChanges(prev => {
				const newChanges = setValueByPath(prev, path, value);
				onChange?.(newChanges);
				return newChanges;
			});
		} else {
			// Value is same as initial — remove from changes
			setChanges(prev => {
				const newChanges = deleteValueByPath(prev, path);
				onChange?.(newChanges);
				return newChanges;
			});
		}
	};

	const handleRawJsonChange = (value: string) => {
		setRawJson(value);
		try {
			const parsed = JSON.parse(value);
			setData(parsed);

			// Compare with initial data and track changes
			const differences = findDifferences(initialData, parsed);
			setChanges(differences);
			onChange?.(differences);

			setJsonError('');
		} catch (error) {
			setJsonError((error as Error).message);
		}
	};

	const findDifferences = (original: any, current: any, basePath = ''): { [key: string]: JsonValue } => {
		const differences: { [key: string]: JsonValue } = {};

		if (typeof original !== typeof current ||
			Array.isArray(original) !== Array.isArray(current)) {
			if (current !== undefined) {
				differences[basePath] = current;
			}
			return differences;
		}

		if (Array.isArray(current)) {
			if (JSON.stringify(original) !== JSON.stringify(current)) {
				differences[basePath] = current;
			}
			return differences;
		}

		if (typeof current === 'object' && current !== null) {
			const allKeys = new Set([
				...Object.keys(original || {}),
				...Object.keys(current)
			]);

			for (const key of allKeys) {
				const newPath = basePath ? `${basePath}.${key}` : key;
				const subDiffs = findDifferences(
					original?.[key],
					current[key],
					newPath
				);
				Object.assign(differences, subDiffs);
			}
			return differences;
		}

		if (original !== current) {
			differences[basePath] = current;
		}

		return differences;
	};

	const toggleExpand = (path: string) => {
		const newExpanded = new Set(expandedPaths);
		if (newExpanded.has(path)) {
			newExpanded.delete(path);
		} else {
			newExpanded.add(path);
		}
		setExpandedPaths(newExpanded);
	};

	const updateValue = (path: string, value: JsonValue) => {
		setData(prevData => {
			const newData = setValueByPath(prevData, path, value);
			setRawJson(JSON.stringify(newData, null, 2));
			return newData;
		});
		updateChanges(path, value);
	};

	const addArrayItem = (path: string) => {
		const current = getValueByPath(data, path);

		if (Array.isArray(current)) {
			const lastItem = current[current.length - 1];
			let newItem;

			if (typeof lastItem === 'object' && lastItem !== null) {
				newItem = Object.keys(lastItem).reduce((acc, key) => {
					acc[key] = typeof lastItem[key] === 'boolean' ? false :
						typeof lastItem[key] === 'number' ? 0 :
							typeof lastItem[key] === 'object' ? {...lastItem[key]} :
								'';
					return acc;
				}, {} as any);
			} else {
				newItem = typeof lastItem === 'number' ? 0 :
					typeof lastItem === 'boolean' ? false : '';
			}

			const newArray = [...current, newItem];
			updateValue(path, newArray);
		}
	};

	const removeArrayItem = (path: string, index: number) => {
		const current = getValueByPath(data, path);

		if (Array.isArray(current)) {
			const newArray = current.filter((_, i) => i !== index);
			updateValue(path, newArray);
		}
	};

	// Rest of the render functions remain the same...
	const renderValue = (value: JsonValue, path: string) => {
		if (Array.isArray(value)) {
			return renderArray(value, path);
		}

		if (typeof value === 'object' && value !== null) {
			return renderObject(value as { [key: string]: JsonValue }, path);
		}

		return (
			<div className="flex items-center gap-2 w-full">
				{typeof value === 'boolean' ? (
					<Select
						value={value ? 'yes' : 'no'}
						onValueChange={(val: any) => updateValue(path, val === 'yes')}
					>
						<SelectTrigger className="w-full">
							<SelectValue/>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="yes">Yes</SelectItem>
							<SelectItem value="no">No</SelectItem>
						</SelectContent>
					</Select>
				) : typeof value === 'number' ? (
					<Input
						type="number"
						value={value}
						onChange={(e) => updateValue(path, Number(e.target.value) || 0)}
						className="w-full"
					/>
				) : (
					<Input
						value={value as string}
						onChange={(e) => updateValue(path, e.target.value)}
						className="w-full"
					/>
				)}
			</div>
		);
	};

	const renderArray = (arr: JsonValue[], path: string) => {
		const isExpanded = expandedPaths.has(path);

		return (
			<div className="ml-6">
				<div
					className="flex items-center gap-2 cursor-pointer mb-2"
					onClick={() => toggleExpand(path)}
				>
					{isExpanded ? (
						<ChevronDown className="h-4 w-4"/>
					) : (
						<ChevronRight className="h-4 w-4"/>
					)}
					<span className="font-medium">{path.split('.').pop()} ({arr.length} items)</span>
				</div>

				{isExpanded && (
					<div className="space-y-2">
						{arr.map((item, index) => (
							<div key={index} className="flex items-start gap-2">
								<span className="text-sm text-gray-500 w-8">[{index}]</span>
								<div className="flex-grow">
									{renderValue(item, `${path}.${index}`)}
								</div>
								<Button
									variant="ghost"
									size="default"
									onClick={() => removeArrayItem(path, index)}
									className="text-red-500 hover:text-red-700 self-start mt-1 bg-white"
								>
									<Trash2 className="h-4 w-4"/>
								</Button>
							</div>
						))}
						<Button
							variant="outline"
							size="sm"
							onClick={() => addArrayItem(path)}
							className="mt-2 bg-white"
						>
							<Plus className="h-4 w-4 mr-2"/>
							Add Item
						</Button>
					</div>
				)}
			</div>
		);
	};

	const renderObject = (obj: { [key: string]: JsonValue }, path: string) => {
		const isExpanded = expandedPaths.has(path);

		return (
			<div className={path ? 'ml-6' : ''}>
				{path && (
					<div
						className="flex items-center gap-2 cursor-pointer mb-2"
						onClick={() => toggleExpand(path)}
					>
						{isExpanded ? (
							<ChevronDown className="h-4 w-4"/>
						) : (
							<ChevronRight className="h-4 w-4"/>
						)}
						<span className="font-medium">{path.split('.').pop()}</span>
					</div>
				)}

				{isExpanded && (
					<div className="space-y-2">
						{Object.entries(obj).sort((_,b) => typeof b[1] !== 'object' ? 1:-1).map(([key, value]) => (
							<div key={key} className="flex items-start gap-2">
								<span className="text-sm text-gray-500 w-24">{key}:</span>
								<div className="flex-grow">
									{renderValue(value, path ? `${path}.${key}` : key)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

	return (
		<Card className="w-full">
			<CardContent className="p-6">
				{renderObject(data, '')}
				<details className={'marker:opacity-0'}>
					<summary className={'marker:opacity-0 block'}>
						<p className={'border rounded w-20 center'}>
							EDIT RAW
						</p>
					</summary>
					<div className="mt-6">
						<Textarea
							value={rawJson}
							onChange={(e: any) => handleRawJsonChange(e.target.value)}
							className="font-mono text-sm min-h-[200px]"
							placeholder="Edit JSON directly..."
						/>
						{jsonError && (
							<div className="mt-2 text-sm text-red-500">
								Error: {jsonError}
							</div>
						)}
					</div>
				</details>
			</CardContent>
		</Card>
	);
};

export default JsonEditor;
