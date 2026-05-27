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

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Extract the complete plain text content from this document. Output ONLY the raw text — no commentary, no summary, no markdown formatting. Preserve all headings, paragraphs, numbered lists, bullet points, and table content as plain text. Do not omit or paraphrase anything.`,
            file_urls: [file_url],
            response_json_schema: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'The complete verbatim plain text content of the document'
                    }
                },
                required: ['text']
            }
        });

        const text = result?.text || '';
        return Response.json({ text, label: label || 'document' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});