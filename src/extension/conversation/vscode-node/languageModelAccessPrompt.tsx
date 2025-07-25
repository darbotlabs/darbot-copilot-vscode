/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Darbot Labs. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { AssistantMessage, PromptElement, PromptElementProps, SystemMessage, ToolMessage, UserMessage } from '@vscode/prompt-tsx';
import * as vscode from 'vscode';
import { LanguageModelTextPart } from 'vscode';
import { SafetyRules } from '../../prompts/node/base/safetyRules';
import { EditorIntegrationRules } from '../../prompts/node/panel/editorIntegrationRules';
import { imageDataPartToTSX, ToolResult } from '../../prompts/node/panel/toolCalling';
import { isImageDataPart } from '../common/languageModelChatMessageHelpers';

export type Props = PromptElementProps<{
	noSafety: boolean;
	messages: Array<vscode.LanguageModelChatMessage | vscode.LanguageModelChatMessage2>;
}>;

export class LanguageModelAccessPrompt extends PromptElement<Props> {
	render() {

		const systemMessages: string[] = [];
		const chatMessages: (UserMessage | AssistantMessage)[] = [];

		for (const message of this.props.messages) {
			if (message.role === vscode.LanguageModelChatMessageRole.System) {
				// Filter out DataPart since it does not share the same value type and does not have callId, function, etc.
				const filteredContent = message.content.filter(part => !(part instanceof vscode.LanguageModelDataPart));
				systemMessages.push(filteredContent
					.filter(part => part instanceof vscode.LanguageModelTextPart)
					.map(part => part.value).join(''));

			} else if (message.role === vscode.LanguageModelChatMessageRole.Assistant) {
				const filteredContent = message.content.filter(part => !(part instanceof vscode.LanguageModelDataPart));
				// There should only be one string part per message
				const content = filteredContent.find(part => part instanceof LanguageModelTextPart);
				const toolCalls = filteredContent.filter(part => part instanceof vscode.LanguageModelToolCallPart);

				chatMessages.push(<AssistantMessage name={message.name} toolCalls={toolCalls.map(tc => ({ id: tc.callId, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.input) } }))}>{content?.value}</AssistantMessage>);
			} else if (message.role === vscode.LanguageModelChatMessageRole.User) {
				message.content.forEach(part => {
					if (part instanceof vscode.LanguageModelToolResultPart2 || part instanceof vscode.LanguageModelToolResultPart) {
						chatMessages.push(
							<ToolMessage toolCallId={part.callId}>
								<ToolResult content={part.content} />
							</ToolMessage>
						);
					} else if (isImageDataPart(part)) {
						chatMessages.push(<UserMessage priority={0}>{imageDataPartToTSX(part)}</UserMessage>);
					} else if (part instanceof vscode.LanguageModelTextPart) {
						chatMessages.push(<UserMessage name={message.name}>{part.value}</UserMessage>);
					}
				});
			}
		}

		return (
			<>
				<SystemMessage>
					{this.props.noSafety
						// Only custom system message
						? systemMessages
						// Our and custom system message
						: <>
							<SafetyRules />
							<EditorIntegrationRules />
							<br />
							{systemMessages.join('\n')}
						</>}
				</SystemMessage>
				{chatMessages}
			</>
		);
	}
}
