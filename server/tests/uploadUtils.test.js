const { isAllowedFileType } = require('../utils/upload');

describe('upload validation helpers', () => {
    test('allows matching mime types and extensions', () => {
        const allowed = isAllowedFileType(
            {
                mimetype: 'image/jpeg',
                originalname: 'passport-photo.jpg',
            },
            new Set(['image/jpeg', 'image/png'])
        );

        expect(allowed).toBe(true);
    });

    test('rejects files whose extension does not match the approved mime type', () => {
        const allowed = isAllowedFileType(
            {
                mimetype: 'image/jpeg',
                originalname: 'payload.html',
            },
            new Set(['image/jpeg', 'image/png'])
        );

        expect(allowed).toBe(false);
    });

    test('rejects explicitly unsafe mime types', () => {
        const allowed = isAllowedFileType(
            {
                mimetype: 'text/html',
                originalname: 'payload.html',
            },
            new Set(['image/jpeg', 'image/png'])
        );

        expect(allowed).toBe(false);
    });
});
