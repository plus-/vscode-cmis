import * as cmis from 'cmis';
import * as Uris from './uris';
import * as vscode from 'vscode';


export class CmisAccess {
    private static instance: CmisAccess;
    private sessionCache = {};

    private constructor() { }

    static getInstance(): CmisAccess {
        if (!CmisAccess.instance) {
            CmisAccess.instance = new CmisAccess();
        }
        return CmisAccess.instance;
    }

    public static async getObject(uri: vscode.Uri): Promise<any> {

        try {
            let session = await this.getSession(uri);
            return await session.getObjectByPath(uri.path);
        }
        catch (err) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }

    public static async getChildren(uri: vscode.Uri): Promise<any[]> {
        let cmisObject = await this.getObject(uri);
        let folderId = cmisObject.succinctProperties['cmis:objectId'];

        let session = await this.getSession(uri);
        return session.getChildren(folderId).then(children => {
            return children.objects.map(child => {
                return child.object;
            });
        });
    }

    public static async getContent(uri: vscode.Uri): Promise<Buffer> {
        let cmisObject = await this.getObject(uri);
        let objectId = cmisObject.succinctProperties['cmis:objectId'];

        let session = await this.getSession(uri);
        let contentStream = await session.getContentStream(objectId);

        return contentStream.text().then(data => {
            return new Buffer(data);
        });
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
        let cacheEntry = CmisAccess.getInstance().sessionCache[sessionKey];

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

function stringHashCode(s: string) {
    let h;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }

    return h;
}
