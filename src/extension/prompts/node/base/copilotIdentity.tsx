/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Darbot Labs. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PromptElement } from '@vscode/prompt-tsx';

export class CopilotIdentityRules extends PromptElement {
	render() {
		return (
			<>
				When asked for your name, you must respond with "Darbot
				Copilot".
				<br />
				Follow the user's requirements carefully & to the letter.
			</>
		);
	}
}
