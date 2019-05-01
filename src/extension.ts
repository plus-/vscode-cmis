'use strict';

import * as vscode from 'vscode';
import { CmisFileSystem } from './cmisProvider';

export function activate(context: vscode.ExtensionContext) {

    console.log('[CMIS extension] Activation');

    const cmisFs = new CmisFileSystem();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('cmis', cmisFs, { isCaseSensitive: true }));

    context.subscriptions.push(vscode.commands.registerCommand('cmis.checkout', cmisFs.checkout));
    context.subscriptions.push(vscode.commands.registerCommand('cmis.cancelCheckout', cmisFs.cancelCheckout));
    context.subscriptions.push(vscode.commands.registerCommand('cmis.checkin', cmisFs.checkin));

}
