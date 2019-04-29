'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { CmisAccess } from './cmisAccess'

export class File implements vscode.FileStat {

    objectId: string;
    name: string;
    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
}

export class Directory implements vscode.FileStat {

    objectId: string;
    name: string;
    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
}

export type Entry = File | Directory;

export class CmisFileSystem implements vscode.FileSystemProvider {

    // --- manage file metadata

    async stat(uri: vscode.Uri): Promise<Entry> {
        try {
            let cmisObject = await CmisAccess.getObject(uri);

            return {
                objectId: cmisObject.succinctProperties['cmis:objectId'],
                ctime: cmisObject.succinctProperties['cmis:creationDate'],
                mtime: cmisObject.succinctProperties['cmis:lastModificationDate'],
                name: cmisObject.succinctProperties['cmis:name'],
                size: 0,
                type: this.getFileType(cmisObject)
            };
        }
        catch (err) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }


    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        let children = await CmisAccess.getChildren(uri);

        let result: [string, vscode.FileType][] = [];
        for (const child of children) {
            result.push([child.succinctProperties['cmis:name'], this.getFileType(child)]);
        }
        return result;
    }

    // --- manage file contents

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return CmisAccess.getContent(uri);
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        // let basename = path.posix.basename(uri.path);
        // let parent = this._lookupParentDirectory(uri);
        // let entry = parent.entries.get(basename);
        // if (entry instanceof Directory) {
        //     throw vscode.FileSystemError.FileIsADirectory(uri);
        // }
        // if (!entry && !options.create) {
        //     throw vscode.FileSystemError.FileNotFound(uri);
        // }
        // if (entry && options.create && !options.overwrite) {
        //     throw vscode.FileSystemError.FileExists(uri);
        // }
        // if (!entry) {
        //     entry = new File(basename);
        //     parent.entries.set(basename, entry);
        //     this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        // }
        // entry.mtime = Date.now();
        // entry.size = content.byteLength;
        // entry.data = content;

        // this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    }

    // --- manage files/folders

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {

        // if (!options.overwrite && this._lookup(newUri)) {
        //     throw vscode.FileSystemError.FileExists(newUri);
        // }

        // let entry = this._lookup(oldUri);
        // let oldParent = this._lookupParentDirectory(oldUri);

        // let newParent = this._lookupParentDirectory(newUri);
        // let newName = path.posix.basename(newUri.path);

        // oldParent.entries.delete(entry.name);
        // entry.name = newName;
        // newParent.entries.set(newName, entry);

        // this._fireSoon(
        //     { type: vscode.FileChangeType.Deleted, uri: oldUri },
        //     { type: vscode.FileChangeType.Created, uri: newUri }
        // );
    }

    delete(uri: vscode.Uri): void {
        // let dirname = uri.with({ path: path.posix.dirname(uri.path) });
        // let basename = path.posix.basename(uri.path);
        // let parent = this._lookupAsDirectory(dirname);
        // if (!parent.entries.has(basename)) {
        //     throw vscode.FileSystemError.FileNotFound(uri);
        // }
        // parent.entries.delete(basename);
        // parent.mtime = Date.now();
        // parent.size -= 1;
        // this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    createDirectory(uri: vscode.Uri): void {
        // let basename = path.posix.basename(uri.path);
        // let dirname = uri.with({ path: path.posix.dirname(uri.path) });
        // let parent = this._lookupAsDirectory(dirname);

        // let entry = new Directory(basename);
        // parent.entries.set(entry.name, entry);
        // parent.mtime = Date.now();
        // parent.size += 1;
        // this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { type: vscode.FileChangeType.Created, uri });
    }


    private getFileType(cmisObject: any): vscode.FileType {
        return 'cmis:folder' === cmisObject.succinctProperties['cmis:baseTypeId'] ? vscode.FileType.Directory : vscode.FileType.File;
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
