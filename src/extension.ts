/*
 * @Author: zhangyu
 * @Date: 2023-10-12 19:10:16
 * @LastEditTime: 2023-10-23 20:42:42
 */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// 绑定触发显示
	const showNameList = vscode.commands.registerCommand('code-naming-artiface.showNameList', () => {
		// 触发联想建议列表
		vscode.commands.executeCommand('editor.action.triggerSuggest')
	})

	// 绑定联想列表
	const nameList = vscode.languages.registerCompletionItemProvider(['typescript', 'javascript'], {
		async provideCompletionItems() {
			// 读取自定义设置
			const configuration = vscode.workspace.getConfiguration('code-naming-artiface')
			const model = configuration.get('model', 'default')
			const token = configuration.get('token', 'default')
			let myCustomCompletionItem: any = []
			const editor = vscode.window.activeTextEditor
			if (editor) {
				const selectText = editor.document.getText(editor.selection)
				try {
					// 请求大模型
					const result = await axios({
						url: `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model}?access_token=${token}`,
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						data: JSON.stringify({
							messages: [
								{
									role: 'user',
									content: `给我20个描述为 “${selectText}” 的驼峰变量名，不要加其他修饰语`
								}
							]
						})
					})
					const text = result?.data?.result
					const variableNames = text.match(/\d+\.\s+([^\n]+)\n?/g)
					myCustomCompletionItem = variableNames.map((str: string) => {
						const name = str.replace(/^\d+\.\s+/, '').replace(/\n/g, '')
						const customCompletionItem = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable)
						customCompletionItem.insertText = name
						customCompletionItem.filterText = selectText
						customCompletionItem.sortText = '0'
						customCompletionItem.command = {
							command: 'code-naming-artiface.createNote',
							title: '选中后添加注释',
							arguments: [editor, selectText]
						}
						return customCompletionItem
					})
				} catch (error) {
					console.log(error)
					vscode.window.showErrorMessage('模型调用错误,请检查配置')
				}
			}
			return myCustomCompletionItem
		}
	})

	// 绑定选中后添加注释事件
	const createNote = vscode.commands.registerCommand('code-naming-artiface.createNote', (editor, prevSelectText) => {
		const currentLine = editor.document.lineAt(editor.selection.start.line)
		const lineText = currentLine.text
		const lineIndentation = lineText.match(/^\s*/)?.[0]
		const position = new vscode.Position(editor.selection.start.line, 0)
		editor.edit((editBuilder: any) => {
			editBuilder.insert(position, `${lineIndentation}// ${prevSelectText}\n`)
		})
	})

	context.subscriptions.push(showNameList, nameList, createNote)
}

// This method is called when your extension is deactivated
export function deactivate() { }
