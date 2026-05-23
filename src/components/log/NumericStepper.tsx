import { useEffect, useState } from 'react';
import { useDebouncedStepper } from './useDebouncedStepper';
import { Stepper, StepBtn, StepValField, StepUnit } from './RuleCard';
import styled from 'styled-components';

const ValWrap = styled.div`
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 0;
	border-left: 1px solid ${({ theme }) => theme.color.hair};
	border-right: 1px solid ${({ theme }) => theme.color.hair};
	background: ${({ theme }) => theme.color.surface};
	padding-right: 6px;

	&:focus-within {
		background: ${({ theme }) => theme.color.surface2};
	}
`;

function roundToDecimals(n: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(n * factor) / factor;
}

function formatValue(n: number, decimals: number): string {
	return decimals === 0 ? String(Math.round(n)) : n.toFixed(decimals);
}

interface Props {
	serverValue: number | null;
	onChange: (value: number) => void;
	decimals: number;
	unit?: string;
	locked?: boolean;
	/** Used for +/- when no value is logged yet. */
	stepBase?: number;
	/** Called whenever the optimistic local value changes (e.g. for linked UI). */
	onLocalChange?: (value: number | null) => void;
}

export function NumericStepper({
	serverValue,
	onChange,
	decimals,
	unit,
	locked = false,
	stepBase = 0,
	onLocalChange,
}: Props) {
	const { localValue, update } = useDebouncedStepper(serverValue, onChange);
	const [text, setText] = useState('');
	const [focused, setFocused] = useState(false);

	const step = decimals === 0 ? 1 : Math.pow(10, -decimals);
	const base = localValue ?? stepBase;

	useEffect(() => {
		onLocalChange?.(localValue);
	}, [localValue, onLocalChange]);

	useEffect(() => {
		if (!focused) {
			setText(localValue !== null ? formatValue(localValue, decimals) : '');
		}
	}, [localValue, focused, decimals]);

	const decrement = () =>
		update(roundToDecimals(base - step, decimals));
	const increment = () =>
		update(roundToDecimals(base + step, decimals));

	const commitText = () => {
		setFocused(false);
		const trimmed = text.trim();
		if (!trimmed) {
			setText(localValue !== null ? formatValue(localValue, decimals) : '');
			return;
		}
		const parsed = parseFloat(trimmed);
		if (!Number.isFinite(parsed)) {
			setText(localValue !== null ? formatValue(localValue, decimals) : '');
			return;
		}
		update(roundToDecimals(parsed, decimals));
	};

	return (
		<Stepper>
			<StepBtn type="button" onClick={decrement} disabled={locked}>
				−
			</StepBtn>
			<ValWrap>
				<StepValField
					type="text"
					inputMode="decimal"
					value={text}
					placeholder="—"
					disabled={locked}
					onFocus={() => {
						setFocused(true);
						if (localValue !== null) {
							setText(formatValue(localValue, decimals));
						}
					}}
					onChange={(e) => setText(e.target.value)}
					onBlur={commitText}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.currentTarget.blur();
						}
					}}
					aria-label={unit ? `Value in ${unit}` : 'Value'}
				/>
				{unit && <StepUnit>{unit}</StepUnit>}
			</ValWrap>
			<StepBtn type="button" onClick={increment} disabled={locked}>
				+
			</StepBtn>
		</Stepper>
	);
}
