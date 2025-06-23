export const copyText = text => {
    if (!navigator.clipboard) {
        // Clipboard API not available
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful ? Promise.resolve() : Promise.reject(new Error('Copy command was unsuccessful'));
        } catch (err) {
            document.body.removeChild(textArea);
            return Promise.reject(err);
        }
    }
    return navigator.clipboard.writeText(text);
};
