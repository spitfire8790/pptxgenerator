import * as GiraffeSdk from '@gi-nx/iframe-sdk';

export async function checkUserClaims() {
    try {
        const state = GiraffeSdk.giraffeState;
        
        if (state?.attr?.giraffe_user?.name) {
            return state.attr.giraffe_user.name;
        }
        
        throw new Error('Could not find user name in Giraffe SDK');
    } catch (error) {
        console.error('Error getting user name:', error);
        throw error;
    }
}

export function getCurrentUserName() {
    const state = GiraffeSdk.giraffeState;
    return state?.attr?.giraffe_user?.name || 'Unknown User';
} 