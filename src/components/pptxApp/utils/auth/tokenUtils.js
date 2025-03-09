import * as GiraffeSdk from '@gi-nx/iframe-sdk';

export async function checkUserClaims() {
    try {
        console.log('Initial GiraffeSdk:', {
            sdk: GiraffeSdk,
            state: GiraffeSdk.giraffeState,
            stateAttrs: GiraffeSdk.giraffeState?.attr,
            user: GiraffeSdk.giraffeState?.attr?.giraffe_user
        });

        // Try state first since we're in the SDK
        const state = GiraffeSdk.giraffeState;
        if (state?.attr?.giraffe_user) {
            const user = state.attr.giraffe_user;
            console.log('Raw user data from state:', user);
            
            const userInfo = {
                email: user.email,
                name: user.name,
                id: user.id
            };
            console.log('Constructed user info from state:', userInfo);
            return userInfo;
        }

        // Fallback to window.giraffe.auth if state fails
        if (window.giraffe?.auth) {
            const user = await window.giraffe.auth.getCurrentUser();
            console.log('Raw user data from giraffe.auth:', user);
            
            if (user) {
                const userInfo = {
                    email: user.email,
                    name: user.name,
                    id: user.id
                };
                console.log('Constructed user info from giraffe.auth:', userInfo);
                return userInfo;
            }
        }
        
        console.log('No user found in either state or giraffe.auth');
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            giraffeState: GiraffeSdk.giraffeState,
            windowGiraffe: window.giraffe
        });
        return null;
    }
}

export async function getCurrentUserName() {
    try {
        console.log('Getting user name from GiraffeSdk state:', GiraffeSdk.giraffeState?.attr?.giraffe_user);
        
        // Try state first
        const state = GiraffeSdk.giraffeState;
        const user = state?.attr?.giraffe_user;
        if (user?.name) {
            console.log('Selected user name from state:', user.name);
            return user.name;
        }

        // Fallback to window.giraffe.auth
        if (window.giraffe?.auth) {
            const user = await window.giraffe.auth.getCurrentUser();
            console.log('Raw user data for name from giraffe.auth:', user);
            
            if (user?.name) {
                console.log('Selected user name from giraffe.auth:', user.name);
                return user.name;
            }
        }
        
        console.log('No user found for name in either source, returning Unknown User');
        return 'Unknown User';
    } catch (error) {
        console.error('Error getting user name:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            giraffeState: GiraffeSdk.giraffeState,
            windowGiraffe: window.giraffe
        });
        return 'Unknown User';
    }
} 