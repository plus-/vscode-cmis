'use strict';

import * as cmis from 'cmis';
import * as Uris from './uris';
import * as vscode from 'vscode';

class File implements vscode.FileStat {

    objectId: string;
    name: string;
    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
}

export type CmisEntry = File;

/**
 *  Facade to the CMIS lib using vscode.Uri. Also manages the CMIS session cache.
 */
export class CmisAdapter {

    private static instance: CmisAdapter;
    private sessionCache = {};

    private constructor() { }

    static getInstance(): CmisAdapter {
        if (!CmisAdapter.instance) {
            CmisAdapter.instance = new CmisAdapter();
        }
        return CmisAdapter.instance;
    }

    public static async getObject(uri: vscode.Uri): Promise<CmisEntry | undefined> {
        let session = await this.getSession(uri);

        return session.getObjectByPath(uri.path).then(toCmisEntry).catch(_ => {
            return;
        });
    }

    public static async getChildren(uri: vscode.Uri): Promise<CmisEntry[]> {
        let session = await this.getSession(uri);
        let cmisObject = await session.getObjectByPath(uri.path);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        let children = await session.getChildren(objectId).then(children => {
            return children.objects.map(child => {
                return child.object;
            });
        });

        return children.map(toCmisEntry);
    }

    public static async getContent(uri: vscode.Uri): Promise<Buffer> {
        let session = await this.getSession(uri);
        let cmisObject = await session.getObjectByPath(uri.path);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        let contentStream = await session.getContentStream(objectId);

        return contentStream.text().then(data => {
            return new Buffer(data);
        });
    }

    public static async createContent(uri: vscode.Uri, content: Buffer, name: string): Promise<void> {
        let session = await this.getSession(uri);
        let cmisObject = await session.getObjectByPath(uri.path);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        return session.createDocument(objectId, content, name);
    }

    public static async writeFile(uri: vscode.Uri, content: Buffer, name: string, overwrite: boolean): Promise<void> {
        let session = await this.getSession(uri);
        let cmisObject = await session.getObjectByPath(uri.path);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        return session.setContentStream(objectId, content, overwrite, name);
    }

    public static async rename(uri: vscode.Uri, name: string): Promise<any> {
        let session = await this.getSession(uri);
        let cmisObject = await session.getObjectByPath(uri.path);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        return session.updateProperties(objectId, {
            'cmis:name': name
        });
    }

    public static async delete(uri: vscode.Uri): Promise<any> {
        let session = await this.getSession(uri);
        let cmisObject = await session.getObjectByPath(uri.path);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        return session.deleteObject(objectId, true);
    }

    public static async createFolder(uri: vscode.Uri, name: string): Promise<any> {
        let session = await this.getSession(uri);
        let cmisObject = await session.getObjectByPath(uri.path);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        return session.createFolder(objectId, name);
    }

    private static async getSession(uri: vscode.Uri): Promise<cmis.CmisSession> {

        var searchParams = new URLSearchParams(uri.query);

        const base = searchParams.get('base');
        const ssl = searchParams.get('ssl');
        const port = ssl ? 443 : 80;
        const authority = Uris.getAuthority(uri);

        if (!authority.user || !authority.password) {
            throw new Error('Unable to retrieve authority');
        }

        if (!base) {
            throw new Error('no base provided in cmis uri');
        }

        const sessionKey = `${authority.host}_${authority.user}_${stringHashCode(base)}`;
        let cacheEntry = CmisAdapter.getInstance().sessionCache[sessionKey];

        if (!cacheEntry) {

            const url = `http${ssl ? 's' : ''}://${authority.host}:${port}/${base}`;

            let session = new cmis.CmisSession(url);
            await session.setCredentials(authority.user, authority.password).loadRepositories();

            cacheEntry = session;
            return cacheEntry;
        } else {
            return cacheEntry;
        }
    }
}

function toCmisEntry(cmisObject: any): CmisEntry {
    return {
        objectId: cmisObject.succinctProperties['cmis:objectId'],
        ctime: cmisObject.succinctProperties['cmis:creationDate'],
        mtime: cmisObject.succinctProperties['cmis:lastModificationDate'],
        name: cmisObject.succinctProperties['cmis:name'],
        size: 0,
        type: getFileType(cmisObject)
    };
}

function getFileType(cmisObject: any): vscode.FileType {
    return 'cmis:folder' === cmisObject.succinctProperties['cmis:baseTypeId'] ? vscode.FileType.Directory : vscode.FileType.File;
}

function stringHashCode(s: string) {
    let h;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }

    return h;
}
