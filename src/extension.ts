'use strict';

import * as vscode from 'vscode';
import { CmisFileSystem } from './cmisProvider';
import { CmisAdapter } from './cmisAdapter';
import * as Uris from './uris';

let lockStatus: vscode.StatusBarItem;

export function activate({ subscriptions }: vscode.ExtensionContext) {

    console.log('[CMIS extension] Activation');

    const cmisFs = new CmisFileSystem();
    subscriptions.push(vscode.workspace.registerFileSystemProvider('cmis', cmisFs, { isCaseSensitive: true }));

    subscriptions.push(vscode.commands.registerCommand('cmis.open', cmisFs.refresh)); //TODO
    subscriptions.push(vscode.commands.registerCommand('cmis.refresh', cmisFs.refresh));
    subscriptions.push(vscode.commands.registerCommand('cmis.checkout', cmisFs.checkout));
    subscriptions.push(vscode.commands.registerCommand('cmis.cancelCheckout', cmisFs.cancelCheckout));
    subscriptions.push(vscode.commands.registerCommand('cmis.checkin', cmisFs.checkin));

    lockStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
}

async function updateStatusBarItem(): Promise<void> {
    let editor = vscode.window.activeTextEditor;

    if (editor && editor.document.uri && editor.document.uri.scheme === 'cmis') {

        //XXX: does the fileSystemProvider store the stat info somewhere already?
        let cmisEntry = await CmisAdapter.getEntry(editor.document.uri);

        if (cmisEntry && cmisEntry.isCheckedOut && cmisEntry.isWorkingCopy) {

            //XXX: should really test for the original document lockOwner
            if (cmisEntry.lastModifiedBy === Uris.getAuthority(editor.document.uri).user) {
                lockStatus.text = '$(pencil) Locked by you for editing.';
                lockStatus.color = new vscode.ThemeColor('editorWarning.foreground');
            }
            else {
                lockStatus.text = `$(lock) Locked by ${cmisEntry.lastModifiedBy}`;
                lockStatus.color = new vscode.ThemeColor('editorError.foreground');
            }
            lockStatus.show();
        }
        else {
            lockStatus.hide();
        }
    } else {
        lockStatus.hide();
    }
}
