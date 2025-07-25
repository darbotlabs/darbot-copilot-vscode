/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Darbot Labs. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


export class EditReason {
	public static create(metadata: ITextModelEditReasonMetadata | undefined): EditReason {
		if (!metadata) {
			return EditReason.unknown;
		}
		return new EditReason(metadata);
	}

	private constructor(
		public readonly metadata: ITextModelEditReasonMetadata,
	) {
	}

	public static readonly unknown = new EditReason({ source: 'unknown', name: undefined });

	toKey(level: number): string {
		return new TextModelEditReason(this.metadata, privateSymbol).toKey(level);
	}
}


const privateSymbol = Symbol('TextModelEditReason');

export class TextModelEditReason {
	constructor(
		public readonly metadata: ITextModelEditReasonMetadata,
		_privateCtorGuard: typeof privateSymbol,
	) { }

	public toString(): string {
		return `${this.metadata.source}`;
	}

	public getType(): string {
		const metadata = this.metadata;
		switch (metadata.source) {
			case 'cursor':
				return metadata.kind;
			case 'inlineCompletionAccept':
				return metadata.source + (metadata.$nes ? ':nes' : '');
			case 'unknown':
				return metadata.name || 'unknown';
			default:
				return metadata.source;
		}
	}

	/**
	 * Converts the metadata to a key string.
	 * Only includes properties/values that have `level` many `$` prefixes or less.
	*/
	public toKey(level: number): string {
		const metadata = this.metadata;
		const keys = Object.entries(metadata).filter(([key, value]) => {
			const prefixCount = (key.match(/\$/g) || []).length;
			return prefixCount <= level && value !== undefined && value !== null && value !== '';
		}).map(([key, value]) => `${key}:${value}`);
		return keys.join('-');
	}
}

type TextModelEditReasonT<T> = TextModelEditReason & {
	metadataT: T;
};

function createEditReason<T extends Record<string, any>>(metadata: T): TextModelEditReasonT<T> {
	return new TextModelEditReason(metadata as any, privateSymbol) as any;
}

export const EditReasons = {
	unknown(data: { name?: string | null }) {
		return createEditReason({
			source: 'unknown',
			name: data.name,
		} as const);
	},

	chatApplyEdits(data: { modelId: string | undefined }) {
		return createEditReason({
			source: 'Chat.applyEdits',
			$modelId: data.modelId,
		} as const);
	},

	inlineCompletionAccept(data: { nes: boolean; requestUuid: string; extensionId: string }) {
		return createEditReason({
			source: 'inlineCompletionAccept',
			$nes: data.nes,
			$extensionId: data.extensionId,
			$$requestUuid: data.requestUuid,
		} as const);
	},

	inlineCompletionPartialAccept(data: { nes: boolean; requestUuid: string; extensionId: string; type: 'word' | 'line' }) {
		return createEditReason({
			source: 'inlineCompletionPartialAccept',
			type: data.type,
			$extensionId: data.extensionId,
			$$requestUuid: data.requestUuid,
		} as const);
	},

	inlineChatApplyEdit(data: { modelId: string | undefined }) {
		return createEditReason({
			source: 'inlineChat.applyEdits',
			$modelId: data.modelId,
		} as const);
	},

	reloadFromDisk: () => createEditReason({ source: 'reloadFromDisk' } as const),

	cursor(data: { kind: 'compositionType' | 'compositionEnd' | 'type' | 'paste' | 'cut' | 'executeCommands' | 'executeCommand'; detailedSource?: string | null }) {
		return createEditReason({
			source: 'cursor',
			kind: data.kind,
			detailedSource: data.detailedSource,
		} as const);
	},

	setValue: () => createEditReason({ source: 'setValue' } as const),
	eolChange: () => createEditReason({ source: 'eolChange' } as const),
	applyEdits: () => createEditReason({ source: 'applyEdits' } as const),
	snippet: () => createEditReason({ source: 'snippet' } as const),
	suggest: (data: { extensionId: string | undefined }) => createEditReason({ source: 'suggest', $extensionId: data.extensionId } as const),
};

type Values<T> = T[keyof T];
type ITextModelEditReasonMetadata = Values<{ [TKey in keyof typeof EditReasons]: ReturnType<typeof EditReasons[TKey]>['metadataT'] }>;
