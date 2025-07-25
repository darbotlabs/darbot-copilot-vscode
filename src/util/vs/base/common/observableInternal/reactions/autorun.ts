//!!! DO NOT modify, this file was COPIED from 'microsoft/vscode'

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Darbot Labs. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IReaderWithStore, IReader, IObservable } from '../base';
import { IChangeTracker } from '../changeTracker';
import { DisposableStore, IDisposable, toDisposable } from '../commonFacade/deps';
import { DebugNameData, IDebugNameData } from '../debugName';
import { AutorunObserver } from './autorunImpl';

/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorun(fn: (reader: IReaderWithStore) => void): IDisposable {
	return new AutorunObserver(
		new DebugNameData(undefined, undefined, fn),
		fn,
		undefined
	);
}

/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorunOpts(options: IDebugNameData & {}, fn: (reader: IReaderWithStore) => void): IDisposable {
	return new AutorunObserver(
		new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn),
		fn,
		undefined
	);
}

/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 *
 * Use `changeTracker.createChangeSummary` to create a "change summary" that can collect the changes.
 * Use `changeTracker.handleChange` to add a reported change to the change summary.
 * The run function is given the last change summary.
 * The change summary is discarded after the run function was called.
 *
 * @see autorun
 */
export function autorunHandleChanges<TChangeSummary>(
	options: IDebugNameData & {
		changeTracker: IChangeTracker<TChangeSummary>;
	},
	fn: (reader: IReader, changeSummary: TChangeSummary) => void
): IDisposable {
	return new AutorunObserver(
		new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn),
		fn,
		options.changeTracker
	);
}

/**
 * @see autorunHandleChanges (but with a disposable store that is cleared before the next run or on dispose)
 */
export function autorunWithStoreHandleChanges<TChangeSummary>(
	options: IDebugNameData & {
		changeTracker: IChangeTracker<TChangeSummary>;
	},
	fn: (reader: IReader, changeSummary: TChangeSummary, store: DisposableStore) => void
): IDisposable {
	const store = new DisposableStore();
	const disposable = autorunHandleChanges(
		{
			owner: options.owner,
			debugName: options.debugName,
			debugReferenceFn: options.debugReferenceFn ?? fn,
			changeTracker: options.changeTracker,
		},
		(reader, changeSummary) => {
			store.clear();
			fn(reader, changeSummary, store);
		}
	);
	return toDisposable(() => {
		disposable.dispose();
		store.dispose();
	});
}

/**
 * @see autorun (but with a disposable store that is cleared before the next run or on dispose)
 *
 * @deprecated Use `autorun(reader => { reader.store.add(...) })` instead!
 */
export function autorunWithStore(fn: (reader: IReader, store: DisposableStore) => void): IDisposable {
	const store = new DisposableStore();
	const disposable = autorunOpts(
		{
			owner: undefined,
			debugName: undefined,
			debugReferenceFn: fn,
		},
		reader => {
			store.clear();
			fn(reader, store);
		}
	);
	return toDisposable(() => {
		disposable.dispose();
		store.dispose();
	});
}

export function autorunDelta<T>(
	observable: IObservable<T>,
	handler: (args: { lastValue: T | undefined; newValue: T }) => void
): IDisposable {
	let _lastValue: T | undefined;
	return autorunOpts({ debugReferenceFn: handler }, (reader) => {
		const newValue = observable.read(reader);
		const lastValue = _lastValue;
		_lastValue = newValue;
		handler({ lastValue, newValue });
	});
}

export function autorunIterableDelta<T>(
	getValue: (reader: IReader) => Iterable<T>,
	handler: (args: { addedValues: T[]; removedValues: T[] }) => void,
	getUniqueIdentifier: (value: T) => unknown = v => v
) {
	const lastValues = new Map<unknown, T>();
	return autorunOpts({ debugReferenceFn: getValue }, (reader) => {
		const newValues = new Map();
		const removedValues = new Map(lastValues);
		for (const value of getValue(reader)) {
			const id = getUniqueIdentifier(value);
			if (lastValues.has(id)) {
				removedValues.delete(id);
			} else {
				newValues.set(id, value);
				lastValues.set(id, value);
			}
		}
		for (const id of removedValues.keys()) {
			lastValues.delete(id);
		}

		if (newValues.size || removedValues.size) {
			handler({ addedValues: [...newValues.values()], removedValues: [...removedValues.values()] });
		}
	});
}
