import * as GiraffeSdk from '@gi-nx/iframe-sdk';

export async function checkUserClaims() {
    try {
        const state = GiraffeSdk.giraffeState;
        
        if (state?.attr?.giraffe_user) {
            return state.attr.giraffe_user;
        }
        
        throw new Error('Could not find user in Giraffe SDK');
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

export function getCurrentUserName() {
    const state = GiraffeSdk.giraffeState;
    return state?.attr?.giraffe_user?.name || 'Unknown User';
} 