import { giraffeState, rpc } from '@gi-nx/iframe-sdk';
import { set } from 'lodash-es';
import { MIN_WIDTH_PIXELS, SIDEBAR_WIDTH_STATE_TO_PERCENTAGE_MAP } from '../constants/common';

/**
 * Sets the sidebar width based on a width state number that maps to a percentage
 * @param newWidthState - The width state number (0-3) that maps to a percentage of screen width
 */
export const setNewWidthState = (newWidthState: number) => {
    const widthInPixels = Math.max(
        SIDEBAR_WIDTH_STATE_TO_PERCENTAGE_MAP[newWidthState] * window.screen.width,
        MIN_WIDTH_PIXELS,
    );
    setNewWidthInPixels(widthInPixels);
};

/**
 * Sets the sidebar width directly in pixels
 * @param widthInPixels - The width in pixels to set the sidebar to
 */
export const setNewWidthInPixels = (widthInPixels: number) => {
    const selectedProjectApp = giraffeState.get('selectedProjectApp');
    if (!selectedProjectApp) return;
    const cloned = structuredClone(selectedProjectApp);
    set(cloned, 'public.layout.rightBarWidth', widthInPixels);
    rpc.invoke('updateProjectApp', [selectedProjectApp.app, cloned]);
};
