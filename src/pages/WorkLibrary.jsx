import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, PenLine, ClipboardCheck, Hammer, Search, Trash2, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const typeConfig = {
    score: { label: 'Score', icon: BarChart3, color: 'bg-primary/10 text-primary' },
    rewrite: { label: 'Rewrite', icon: PenLine, color: 'bg-accent/10 text-accent' },
    evaluate: { label: 'Evaluate', icon: ClipboardCheck, color: 'bg-chart-3/10 text-chart-3' },
    build: { label: 'Build', icon: Hammer, color: 'bg-chart-4/10 text-chart-4' },
};

export default function WorkLibrary() {
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const queryClient = useQueryClient();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['workLibrary'],
        queryFn: () => base44.entities.WorkLibraryItem.list('-created_date', 100),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.WorkLibraryItem.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workLibrary'] });
            setSelectedItem(null);
        },
    });

    const filtered = items.filter(item =>
        !search || item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.unit_code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Work Library</h1>
                        <p className="text-sm text-muted-foreground mt-1">Saved scores, rewrites, evaluations and assessments</p>
                    </div>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title or unit code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                            {search ? 'No items match your search' : 'No saved items yet. Complete a task in the chat to save outputs here.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((item) => {
                            const config = typeConfig[item.task_type] || typeConfig.score;
                            const TypeIcon = config.icon;
                            return (
                                <Card
                                    key={item.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow group relative"
                                    onClick={() => setSelectedItem(item)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <Badge variant="secondary" className={config.color}>
                                                <TypeIcon className="h-3 w-3 mr-1" />
                                                {config.label}
                                            </Badge>
                                            <div className="flex items-center gap-2">
                                                {item.created_date && (
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(item.created_date), 'dd MMM yyyy')}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                        <CardTitle className="text-sm mt-2 line-clamp-2">{item.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            {item.unit_code && <span>{item.unit_code}</span>}
                                            {item.fkgl != null && <span>FKGL {item.fkgl}</span>}
                                            {item.fre != null && <span>FRE {item.fre}</span>}
                                            {item.band && <span>{item.band}</span>}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    {selectedItem && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedItem.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {selectedItem.unit_code && (
                                        <div><span className="text-muted-foreground">Unit:</span> {selectedItem.unit_code} {selectedItem.unit_title}</div>
                                    )}
                                    {selectedItem.aqf_level && (
                                        <div><span className="text-muted-foreground">AQF:</span> {selectedItem.aqf_level}</div>
                                    )}
                                    {selectedItem.fkgl != null && (
                                        <div><span className="text-muted-foreground">FKGL:</span> {selectedItem.fkgl}</div>
                                    )}
                                    {selectedItem.fre != null && (
                                        <div><span className="text-muted-foreground">FRE:</span> {selectedItem.fre}</div>
                                    )}
                                    {selectedItem.band && (
                                        <div><span className="text-muted-foreground">Band:</span> {selectedItem.band}</div>
                                    )}
                                </div>

                                {selectedItem.original_text && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Original Text</p>
                                        <pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">{selectedItem.original_text}</pre>
                                    </div>
                                )}

                                {selectedItem.output_text && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                                        <pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">{selectedItem.output_text}</pre>
                                    </div>
                                )}

                                {selectedItem.notes && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                                        <p className="text-sm">{selectedItem.notes}</p>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteMutation.mutate(selectedItem.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}