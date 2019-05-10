'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { CmisAdapter, CmisEntry } from './cmisAdapter'

export class CmisFileSystem implements vscode.FileSystemProvider {

    // --- manage file metadata

    async stat(uri: vscode.Uri): Promise<CmisEntry> {
        let entry = await CmisAdapter.getEntry(uri);

        if (!entry) {
            throw vscode.FileSystemError.FileNotFound(uri);
        };

        return entry;
    }

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        let children = await CmisAdapter.getChildren(uri);

        return children.map(child => {

            //TODO: use decoration provider once API is public (see https://github.com/Microsoft/vscode/issues/54938)
            // to visualize working copy and trim the working copy label from the name:
            //let name = child.isWorkingCopy?child.name.replace(' ' + child.workingCopyLabel, ''):child.name;

            return [child.name, child.type];
        });
    }

    // --- manage file contents

    readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return CmisAdapter.getContent(uri);
    }

    async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {

        let entry = await CmisAdapter.getEntry(uri);

        if (entry && entry.type === vscode.FileType.Directory) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        };

        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }

        let name = path.posix.basename(uri.path);

        if (!entry) {
            let folderUri = uri.with({ path: path.posix.dirname(uri.path) });
            await CmisAdapter.createContent(folderUri, new Buffer(content), name);
            this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        }
        else {
            CmisAdapter.writeFile(uri, new Buffer(content), name, options.overwrite);
        }

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    }

    // --- manage files/folders

    async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {

        if (!options.overwrite && await CmisAdapter.getEntry(newUri)) {
            throw vscode.FileSystemError.FileExists(newUri);
        }

        let name = path.posix.basename(newUri.path);

        CmisAdapter.rename(oldUri, name).catch(_ => {
            throw vscode.FileSystemError.Unavailable(oldUri);
        });

        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: oldUri },
            { type: vscode.FileChangeType.Created, uri: newUri }
        );
    }

    delete(uri: vscode.Uri): void {

        CmisAdapter.delete(uri).catch(_ => {
            throw vscode.FileSystemError.Unavailable(uri);
        });

        let folderUri = uri.with({ path: path.posix.dirname(uri.path) });

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: folderUri }, { uri, type: vscode.FileChangeType.Deleted });
    }

    async createDirectory(uri: vscode.Uri): Promise<void> {

        if (await CmisAdapter.getEntry(uri)) {
            throw vscode.FileSystemError.FileExists(uri);
        }

        let name = path.posix.basename(uri.path);
        let folderUri = uri.with({ path: path.posix.dirname(uri.path) });

        CmisAdapter.createFolder(folderUri, name);

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: folderUri }, { type: vscode.FileChangeType.Created, uri });
    }

    async refresh(uri: vscode.Uri) {
        let entry = await CmisAdapter.getEntry(uri);

        if (!entry) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        if (entry.type === vscode.FileType.File) {
            await CmisAdapter.getEntry(uri, true);
        } else if (entry.type === vscode.FileType.Directory) {
            let i = 1;
        }

        this._fireSoon(
            { uri, type: vscode.FileChangeType.Changed }
        );
    }

    async checkout(uri: vscode.Uri) {
        let entry = await CmisAdapter.getEntry(uri);

        if (!entry) {
            throw vscode.FileSystemError.FileNotFound(uri);
        };

        if (!entry.isCheckedOut) {
            let workingCopy = await CmisAdapter.checkout(uri);

            let folderUri = uri.with({ path: path.posix.dirname(uri.path) });

            this._fireSoon(
                { type: vscode.FileChangeType.Changed, uri: folderUri },
                { uri, type: vscode.FileChangeType.Deleted }
            );
        }
    }

    async cancelCheckout(uri: vscode.Uri) {
        let entry = await CmisAdapter.getEntry(uri);

        if (!entry) {
            throw vscode.FileSystemError.FileNotFound(uri);
        };

        if (entry.isCheckedOut) {
            await CmisAdapter.cancelCheckout(uri);

            let folderUri = uri.with({ path: path.posix.dirname(uri.path) });

            this._fireSoon(
                { type: vscode.FileChangeType.Changed, uri: folderUri },
                { uri, type: vscode.FileChangeType.Deleted }
            );
        }
    }

    async checkin(uri: vscode.Uri) {
        let entry = await CmisAdapter.getEntry(uri);

        if (!entry) {
            throw vscode.FileSystemError.FileNotFound(uri);
        };

        if (entry.isCheckedOut) {
            let originalDocument = await CmisAdapter.checkin(uri);

            let folderUri = uri.with({ path: path.posix.dirname(uri.path) });

            this._fireSoon(
                { type: vscode.FileChangeType.Changed, uri: folderUri },
                { uri, type: vscode.FileChangeType.Deleted }
            );
        }
    }

    // --- manage file events

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(resource: vscode.Uri, opts): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);
        clearTimeout(this._fireSoonHandle);
        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}
