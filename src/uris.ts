import * as vscode from 'vscode';
import * as url from 'url';

// scheme://authority/path?query#fragment
// scheme://[user:password@]host[:port][/path/to/file/or/folder]?[queryParam1=value1&queryParam2=value2]

export class Authority {
    user: string | undefined;
    password: string | undefined;
    host: string | undefined;
    port: string | undefined;
}

export function getAuthority(uri: vscode.Uri): Authority {

    const { host, port } = url.parse(uri.toString());

    const indexOfUserInfoSep = uri.authority.lastIndexOf('@');

    if (indexOfUserInfoSep > -1) {
        const userinfo = uri.authority.substr(0, indexOfUserInfoSep);
        const indexOfPasswdSep = userinfo.indexOf(':');

        return {
            host,
            port,
            user: userinfo.substr(0, indexOfPasswdSep),
            password: userinfo.substr(indexOfPasswdSep + 1)
        }
    }
    else {
        return { host, port, user: undefined, password: undefined };
    }
}
