/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Darbot Labs. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { CancellationToken, NotebookCell, NotebookDocument, Uri } from 'vscode';
import { getLanguage } from '../../../util/common/languages';
import { isUri } from '../../../util/common/types';
import { EndOfLine, NotebookCellKind, Position } from '../../../vscodeTypes';
import { BaseAlternativeNotebookContentProvider } from './alternativeContentProvider';
import { AlternativeNotebookDocument } from './alternativeNotebookDocument';
import { EOL, getCellIdMap, getDefaultLanguage, LineOfCellText, LineOfText, summarize, SummaryCell } from './helpers';

const StartDelimter = `<VSCode.Cell `;
const StartEmptyCellDelimter = `<VSCode.Cell>`;
const EndDelimter = `</VSCode.Cell>`;

function generatePartialStartDelimiterWithId(id: string) {
	return `${StartDelimter}id="${id}" `;
}

function generateCellMarker(cell: SummaryCell) {
	return `${generatePartialStartDelimiterWithId(cell.id)}language="${cell.language}">`;
}

export function isXmlContent(text: string): boolean {
	return text.includes(StartDelimter) || text.includes(EndDelimter) || text.includes(StartEmptyCellDelimter);
}


class AlternativeXmlDocument extends AlternativeNotebookDocument {
	override fromCellPosition(cellIndex: number, position: Position): Position {
		const cell = this.notebook.cellAt(cellIndex);
		const cellSummary = summarize(cell);
		const cellMarker = generateCellMarker(cellSummary);

		const eolLength = cell.document.eol === EndOfLine.LF ? 1 : 2;

		const alternativeContentText = this.getText();
		const offsetInCell = cell.document.offsetAt(position);
		const offset = alternativeContentText.indexOf(cellMarker) + cellMarker.length + eolLength + offsetInCell;
		return this.positionAt(offset);
	}
}

export class AlternativeXmlNotebookContentProvider extends BaseAlternativeNotebookContentProvider {
	constructor() {
		super('xml');
	}
	public getAlternativeContent(notebook: NotebookDocument): string {
		const cells = notebook.getCells().map(cell => summarize(cell));

		return cells.map(cell => `${generateCellMarker(cell)}${EOL}${cell.source.join(EOL)}${EOL}${EndDelimter}`).join(EOL);
	}

	public stripCellMarkers(text: string): string {
		const lines = text.split(EOL);
		if (lines.length && (lines[0].startsWith(StartDelimter) || lines[0].startsWith(StartEmptyCellDelimter))) {
			lines.shift();
		}
		if (lines.length && lines[lines.length - 1].trim().endsWith(EndDelimter)) {
			lines[lines.length - 1] = lines[lines.length - 1].substring(0, lines[lines.length - 1].lastIndexOf(EndDelimter));
		}
		return lines.join(EOL);
	}

	public override getSummaryOfStructure(notebook: NotebookDocument, cellsToInclude: NotebookCell[], existingCodeMarker: string): string {
		const lines: string[] = [];
		const existingCodeMarkerWithComment = `// ${existingCodeMarker}`;
		notebook.getCells().forEach((cell) => {
			if (cellsToInclude.includes(cell)) {
				const cellSummary = summarize(cell);
				lines.push(generateCellMarker(cellSummary));
				if (cellSummary.source.length && cellSummary.source[0].trim().length) {
					lines.push(cellSummary.source[0]);
					lines.push(existingCodeMarkerWithComment);
				} else if (cellSummary.source.length && cellSummary.source.some(line => line.trim().length)) {
					cellSummary.source = [existingCodeMarkerWithComment, cellSummary.source.filter(line => line.trim().length)[0], existingCodeMarkerWithComment];
				} else {
					lines.push(existingCodeMarkerWithComment);
				}
				lines.push(EndDelimter);
			} else if (!lines.length || lines[lines.length - 1] !== existingCodeMarkerWithComment) {
				lines.push(existingCodeMarkerWithComment);
			}
		});
		return lines.join(EOL);
	}

	public async *parseAlternateContent(notebookOrUri: NotebookDocument | Uri, inputStream: AsyncIterable<LineOfText>, token: CancellationToken): AsyncIterable<LineOfCellText> {
		const isNotebook = !isUri(notebookOrUri);
		const cellIdMap = isNotebook ? getCellIdMap(notebookOrUri) : new Map<string, NotebookCell>();


		let index = -1;
		let endDelimiterSeen = false;
		const cellIdsSeen = new Set<string>();
		let previousLineEndedWithEndCellMarker = false;
		let previousLine: LineOfCellText | undefined = undefined;
		const defaultLanguage = isNotebook ? getLanguage(getDefaultLanguage(notebookOrUri)).languageId : undefined;
		for await (const lineOfText of inputStream) {
			if (token.isCancellationRequested) {
				break;
			}
			const line = lineOfText.value;
			if ((line.startsWith(StartDelimter) || line.startsWith(StartEmptyCellDelimter)) && (index < 0 || (endDelimiterSeen || (previousLineEndedWithEndCellMarker && previousLine)))) {
				if (!endDelimiterSeen && previousLineEndedWithEndCellMarker && previousLine) {
					// Last line didn't finish, emit that, but strip the end delimiter.
					previousLine.line = previousLine.line.substring(0, previousLine.line.lastIndexOf(EndDelimter));
					yield previousLine;
					yield { type: 'end', index: previousLine.index };
				}
				previousLineEndedWithEndCellMarker = false;
				previousLine = undefined;

				index += 1;
				endDelimiterSeen = false;
				const lineOfCellText: LineOfCellText = { type: 'start', index, uri: undefined, language: undefined, kind: NotebookCellKind.Code };
				const cellParts = extractCellParts(line, defaultLanguage);
				// LLM returns duplicate cell with the same id.
				// We need tests for this.
				// this is a work around to treat subsequent cells as new cells.
				if (cellParts.id && cellIdMap.get(cellParts.id)?.document.languageId === cellParts.language) {
					if (cellIdsSeen.has(cellParts.id)) {
						cellParts.id = '';
					} else {
						cellIdsSeen.add(cellParts.id);
					}
				} else {
					// Possible duplicate cell with the same id but different language.
					// In such cases, treat them as new cells.
					cellParts.id = '';
				}
				const cell = cellIdMap.get(cellParts.id)?.document.languageId === cellParts.language ? cellIdMap.get(cellParts.id) : undefined;
				lineOfCellText.id = cellParts.id;
				lineOfCellText.language = cellParts.language;
				lineOfCellText.uri = cell?.document.uri;
				lineOfCellText.kind = cell?.kind || (lineOfCellText.language === 'markdown' ? NotebookCellKind.Markup : NotebookCellKind.Code);
				yield lineOfCellText;
			} else if (line.startsWith(EndDelimter)) {
				if (previousLineEndedWithEndCellMarker && previousLine) {
					// The last line somehow ends with the cell marker (must have been added by the user),
					// yield the previous line.
					yield previousLine;
				}

				endDelimiterSeen = true;
				previousLineEndedWithEndCellMarker = false;
				previousLine = undefined;
				yield { type: 'end', index };
			} else if (index >= 0) {
				if (previousLineEndedWithEndCellMarker && previousLine) {
					// Some how we have two subsequent lines that end with the cell marker,
					// Weird, shoudl not happen, if it does, yield the previous line.
					yield previousLine;
					previousLine = undefined;
				}
				previousLineEndedWithEndCellMarker = line.endsWith(EndDelimter);
				if (previousLineEndedWithEndCellMarker) {
					previousLine = { type: 'line', index, line };
				} else {
					yield { type: 'line', index, line };
				}
			}
		}
	}

	public override getAlternativeDocument(notebook: NotebookDocument): AlternativeNotebookDocument {
		const text = this.getAlternativeContent(notebook);
		return new AlternativeXmlDocument(text, notebook);
	}

}


function extractCellParts(line: string, defaultLanguage: string | undefined): { id: string; language: string } {
	const idMatch = line.match(/id="([^"]+)"/);
	const languageMatch = line.match(/language="([^"]+)"/);
	if (!languageMatch) {
		if (isXmlContent(line) && typeof defaultLanguage === 'string') {
			// If we have a cell marker but no language, we assume the default language.
			return { id: idMatch ? idMatch[1].trim() : '', language: defaultLanguage };
		}
		throw new Error(`Invalid cell part in ${line}`);
	}

	// New cells will not have an id.
	return { id: idMatch ? idMatch[1].trim() : '', language: languageMatch[1].trim() };
}