export const checkDocuments = (required: string[], providedDocs: any[]): string[] => {
  if (!required || required.length === 0) return [];
  
  const providedMetadata = providedDocs.map((d, index) => {
    if (typeof d === 'string') return d.toLowerCase();
    const name = (d.name || d.fileName || '').toLowerCase();
    let type = (d.type || d.documentType || d.category || '').toLowerCase();
    
    // Auto-match if it's a generic "other" or "application/..." type
    if ((type === 'other' || type.includes('application/')) && required[index]) {
      type = required[index].toLowerCase();
    }
    
    return { name, type };
  });
  
  const missing = required.filter(req => {
    const reqLower = req.toLowerCase();
    return !providedMetadata.some(meta => {
      if (typeof meta === 'string') return meta.includes(reqLower);
      return meta.name.includes(reqLower) || 
             meta.type.includes(reqLower) || 
             reqLower.includes(meta.type) ||
             reqLower.includes(meta.name);
    });
  });
  
  return missing;
};
