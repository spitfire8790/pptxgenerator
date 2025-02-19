import { proxyRequest } from '../../services/proxyService';

export class NSWPortalAuthManager {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.tokenUrl = 'https://portal.data.nsw.gov.au/portal/sharing/rest/generateToken';
        this.currentToken = null;
        this.tokenExpiration = null;
    }

    async getToken() {
        if (this.isTokenValid()) {
            return this.currentToken;
        }
        return this.refreshToken();
    }

    isTokenValid() {
        if (!this.currentToken || !this.tokenExpiration) {
            return false;
        }
        return new Date().getTime() < (this.tokenExpiration - 300000);
    }

    async refreshToken() {
        try {
            const params = new URLSearchParams({
                username: this.username,
                password: this.password,
                client: 'referer',
                referer: window.location.origin,
                expiration: 60,
                f: 'json'
            });

            const response = await proxyRequest(`${this.tokenUrl}?${params.toString()}`);
            
            if (response.error) {
                throw new Error(`Authentication error: ${response.error.message || response.error}`);
            }

            this.currentToken = response.token;
            this.tokenExpiration = new Date().getTime() + (response.expires * 1000);
            
            return this.currentToken;
        } catch (error) {
            console.error('Error refreshing token:', error);
            throw error;
        }
    }

    addTokenToUrl(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${this.currentToken}`;
    }
}

export const nswPortalAuth = new NSWPortalAuthManager(
    'james.strutt@dpie.nsw.gov.au',
    'B6pwt266()_+_)('
);
