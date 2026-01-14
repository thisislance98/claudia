import { useEffect, useCallback, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { selectDirectory, getDirectorySelectionInfo } from '../services/filePickerService';
import { getBrowserCapabilities } from '../utils/browserCapabilities';
import { PathInputModal } from './PathInputModal';

interface ProjectPickerProps {
    onSelect: (path: string) => void;
}

export function ProjectPicker({ onSelect }: ProjectPickerProps) {
    const { showProjectPicker, setShowProjectPicker } = useTaskStore();
    const [showPathInput, setShowPathInput] = useState(false);

    const handleFolderSelect = useCallback(async () => {
        try {
            console.log('[ProjectPicker] Opening folder selection dialog...');

            const capabilities = getBrowserCapabilities();
            const selectionInfo = getDirectorySelectionInfo();

            if (!selectionInfo.available) {
                console.error('[ProjectPicker] Directory selection not available');
                alert(selectionInfo.message);
                setShowProjectPicker(false);
                return;
            }

            // In browser mode, show path input modal instead
            if (capabilities.directorySelectionMethod === 'filesystem-api') {
                console.log('[ProjectPicker] Browser mode detected, showing path input modal');
                setShowPathInput(true);
                setShowProjectPicker(false);
                return;
            }

            const result = await selectDirectory();

            if (result.success && result.path) {
                console.log('[ProjectPicker] Selected path:', result.path);
                onSelect(result.path);
            } else if (result.error && result.error.type !== 'cancelled') {
                alert(result.error.message || 'Failed to select directory');
            }
        } catch (error) {
            console.error('[ProjectPicker] Unexpected error:', error);
            alert(error instanceof Error ? error.message : 'Failed to select directory');
        } finally {
            setShowProjectPicker(false);
        }
    }, [onSelect, setShowProjectPicker]);

    useEffect(() => {
        if (showProjectPicker) {
            console.log('[ProjectPicker] showProjectPicker triggered');
            handleFolderSelect();
        }
    }, [showProjectPicker, handleFolderSelect]);

    const handlePathSubmit = (path: string) => {
        console.log('[ProjectPicker] Manual path submitted:', path);
        onSelect(path);
        setShowPathInput(false);
    };

    const handlePathCancel = () => {
        console.log('[ProjectPicker] Path input cancelled');
        setShowPathInput(false);
    };

    return (
        <>
            {showPathInput && (
                <PathInputModal
                    onSubmit={handlePathSubmit}
                    onCancel={handlePathCancel}
                />
            )}
        </>
    );
}
