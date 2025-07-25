/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Darbot Labs. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IResponsePart } from '../../../platform/chat/common/chatMLFetcher';
import { AsyncIterableObject } from '../../../util/vs/base/common/async';


export function toLines(stream: AsyncIterableObject<IResponsePart>) {
	return new AsyncIterableObject<string>(async (emitter) => {
		let buffer = '';

		for await (const chunk of stream) {
			buffer += chunk.delta.text;

			const parts = buffer.split(/\r?\n/);
			buffer = parts.pop() ?? '';

			emitter.emitMany(parts);
		}

		if (buffer) {
			emitter.emitOne(buffer);
		}
	});
}

/**
 * Remove backticks on the first and last lines.
 */
export function linesWithBackticksRemoved(linesStream: AsyncIterableObject<string>) {
	return new AsyncIterableObject<string>(async (emitter) => {
		let lineN = -1;

		let bufferedBacktickLine: string | undefined;

		for await (const line of linesStream) {
			++lineN;

			if (bufferedBacktickLine) {
				emitter.emitOne(bufferedBacktickLine);
				bufferedBacktickLine = undefined;
			}

			if (line.match(/^```[a-z]*$/)) {
				if (lineN === 0) {
					continue;
				} else {
					// maybe middle of stream or last line
					// we set it to buffer; if it's midle of stream, it will be emitted
					// if last line, it will be omitted
					bufferedBacktickLine = line;
				}
			} else {
				emitter.emitOne(line);
			}
		}

		// ignore bufferedLine
	});
}
