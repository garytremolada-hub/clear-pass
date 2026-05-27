import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, label } = await req.json();
        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'The full plain text content of the document, preserving all headings, paragraphs, lists, and structured content as plain text. Do not summarise — extract everything verbatim.'
                    }
                },
                required: ['text']
            }
        });

        if (result.status !== 'success') {
            return Response.json({ error: result.details || 'Extraction failed' }, { status: 500 });
        }

        const text = result.output?.text || '';
        return Response.json({ text, label: label || 'document' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});