/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Darbot Labs. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { afterAll, describe, expect, test } from 'vitest';
import { _dispose } from '../../node/parserImpl';
import { WASMLanguage } from '../../node/treeSitterLanguages';
import { fromFixture, srcWithAnnotatedStructure } from './getStructure.util';

describe('getStructure - js', () => {
	afterAll(() => _dispose());

	function jsStruct(source: string) {
		return srcWithAnnotatedStructure(WASMLanguage.JavaScript, source);
	}

	test('source with different syntax constructs', async () => {

		const source = await fromFixture('test.js');

		expect(await jsStruct(source)).toMatchSnapshot();
	});
});
