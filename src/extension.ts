'use strict';

import * as vscode from 'vscode';
import { CmisFileSystem } from './cmisProvider';

export function activate({ subscriptions }: vscode.ExtensionContext) {

    console.log('[CMIS extension] Activation');

    const cmisFs = new CmisFileSystem();
    subscriptions.push(vscode.workspace.registerFileSystemProvider('cmis', cmisFs, { isCaseSensitive: true }));
}
