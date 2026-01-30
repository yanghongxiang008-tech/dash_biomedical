import React, { useMemo, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { Contact, Interaction } from './types';
import { contactTypeConfig } from './types';
import { useI18n } from '@/i18n';

interface ConnectionMapProps {
  contacts: Contact[];
  interactions: Interaction[];
  onContactClick: (contact: Contact) => void;
}

type ViewMode = 'all' | 'company' | 'tag' | 'project';

interface Node {
  id: string;
  type: 'contact' | 'group';
  label: string;
  fullName: string;
  x: number;
  y: number;
  color: string;
  size: number;
  logoUrl?: string;
  companyName?: string;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

// Helper function to check for overlaps and adjust positions
const resolveOverlaps = (nodes: Node[], minDistance: number): Node[] => {
  const result = [...nodes];
  const maxIterations = 50;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let hasOverlap = false;
    
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].x - result[i].x;
        const dy = result[j].y - result[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (result[i].size + result[j].size) * 0.8 + minDistance;
        
        if (dist < minDist && dist > 0) {
          hasOverlap = true;
          const overlap = (minDist - dist) / 2;
          const angle = Math.atan2(dy, dx);
          
          result[i].x -= Math.cos(angle) * overlap;
          result[i].y -= Math.sin(angle) * overlap;
          result[j].x += Math.cos(angle) * overlap;
          result[j].y += Math.sin(angle) * overlap;
          
          // Keep within bounds
          result[i].x = Math.max(25, Math.min(375, result[i].x));
          result[i].y = Math.max(20, Math.min(156, result[i].y));
          result[j].x = Math.max(25, Math.min(375, result[j].x));
          result[j].y = Math.max(20, Math.min(156, result[j].y));
        }
      }
    }
    
    if (!hasOverlap) break;
  }
  
  return result;
};

// Get company logo from contacts
const getCompanyLogo = (company: string, contacts: Contact[]): string | undefined => {
  // Check if any contact from this company has a deal with logo
  const contact = contacts.find(c => c.company === company);
  // For now, we don't have logo URLs on contacts, so return undefined
  // This could be extended to pull from deals or other sources
  return undefined;
};

const ConnectionMap: React.FC<ConnectionMapProps> = ({ contacts, interactions, onContactClick }) => {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [scale, setScale] = useState(1);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeMap = new Map<string, Edge>();
    
    const centerX = 200;
    const centerY = 88;
    
    // Calculate scale factor based on number of items
    const getScaleFactor = (count: number) => {
      if (count <= 8) return 1;
      if (count <= 12) return 0.85;
      if (count <= 16) return 0.7;
      return 0.6;
    };
    
    if (viewMode === 'all') {
      const connectionCounts = new Map<string, number>();
      
      contacts.forEach(contact => {
        let count = 0;
        if (contact.company) {
          contacts.forEach(other => {
            if (other.id !== contact.id && other.company === contact.company) count++;
          });
        }
        contact.tags?.forEach(tag => {
          contacts.forEach(other => {
            if (other.id !== contact.id && other.tags?.includes(tag)) count++;
          });
        });
        connectionCounts.set(contact.id, count);
      });
      
      const contactCount = Math.min(contacts.length, 20);
      const scaleFactor = getScaleFactor(contactCount);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      
      contacts.slice(0, contactCount).forEach((contact, idx) => {
        const angle = idx * goldenAngle;
        const radius = (30 + Math.sqrt(idx) * 22) * scaleFactor;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.6;
        
        const typeColor = contactTypeConfig[contact.contact_type]?.color || 'text-muted-foreground';
        const connections = connectionCounts.get(contact.id) || 0;
        
        nodeMap.set(contact.id, {
          id: contact.id,
          type: 'contact',
          label: contact.name.split(' ')[0].substring(0, 3),
          fullName: contact.name,
          x: Math.max(30, Math.min(370, x)),
          y: Math.max(25, Math.min(150, y)),
          color: typeColor.includes('blue') ? '#3b82f6' : 
                 typeColor.includes('purple') ? '#a855f7' :
                 typeColor.includes('emerald') ? '#10b981' :
                 typeColor.includes('amber') ? '#f59e0b' : '#6b7280',
          size: (12 + Math.min(connections * 1.5, 8)) * scaleFactor,
        });
        
        if (contact.company) {
          contacts.slice(0, contactCount).forEach(other => {
            if (other.id !== contact.id && other.company === contact.company) {
              const edgeKey = [contact.id, other.id].sort().join('-');
              if (!edgeMap.has(edgeKey)) {
                edgeMap.set(edgeKey, { source: contact.id, target: other.id, strength: 2 });
              }
            }
          });
        }
        
        contact.tags?.forEach(tag => {
          contacts.slice(0, contactCount).forEach(other => {
            if (other.id !== contact.id && other.tags?.includes(tag)) {
              const edgeKey = [contact.id, other.id].sort().join('-');
              if (!edgeMap.has(edgeKey)) {
                edgeMap.set(edgeKey, { source: contact.id, target: other.id, strength: 1 });
              }
            }
          });
        });
      });
    } else if (viewMode === 'company') {
      const companyMap = new Map<string, Contact[]>();
      contacts.forEach(c => {
        if (c.company) {
          if (!companyMap.has(c.company)) companyMap.set(c.company, []);
          companyMap.get(c.company)!.push(c);
        }
      });
      
      const companies = [...companyMap.entries()].filter(([, cs]) => cs.length > 0).slice(0, 8);
      const scaleFactor = getScaleFactor(companies.length * 3);
      const angleStep = (2 * Math.PI) / Math.max(companies.length, 1);
      
      companies.forEach(([company, companyContacts], idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        const radius = 55 * scaleFactor;
        const groupX = centerX + Math.cos(angle) * radius;
        const groupY = centerY + Math.sin(angle) * radius * 0.7;
        
        const groupId = `company-${company}`;
        const logoUrl = getCompanyLogo(company, contacts);
        
        // Use a soft gradient color instead of black
        nodeMap.set(groupId, {
          id: groupId,
          type: 'group',
          label: company.substring(0, 4),
          fullName: company,
          x: groupX,
          y: groupY,
          color: '#94a3b8', // Soft slate color
          size: (16 + Math.min(companyContacts.length * 2, 10)) * scaleFactor,
          logoUrl,
          companyName: company,
        });
        
        companyContacts.slice(0, 4).forEach((contact, cIdx) => {
          const contactAngle = angle + ((cIdx - 1.5) * 0.4);
          const contactRadius = 28 * scaleFactor;
          const cx = groupX + Math.cos(contactAngle) * contactRadius;
          const cy = groupY + Math.sin(contactAngle) * contactRadius * 0.7;
          
          const typeColor = contactTypeConfig[contact.contact_type]?.color || 'text-muted-foreground';
          
          nodeMap.set(contact.id, {
            id: contact.id,
            type: 'contact',
            label: contact.name.split(' ')[0].substring(0, 2),
            fullName: contact.name,
            x: Math.max(20, Math.min(380, cx)),
            y: Math.max(15, Math.min(160, cy)),
            color: typeColor.includes('blue') ? '#3b82f6' : 
                   typeColor.includes('purple') ? '#a855f7' :
                   typeColor.includes('emerald') ? '#10b981' :
                   typeColor.includes('amber') ? '#f59e0b' : '#6b7280',
            size: 9 * scaleFactor,
          });
          
          edgeMap.set(`${groupId}-${contact.id}`, { source: groupId, target: contact.id, strength: 2 });
        });
      });
    } else if (viewMode === 'tag') {
      const tagMap = new Map<string, Contact[]>();
      contacts.forEach(c => {
        c.tags?.forEach(tag => {
          if (!tagMap.has(tag)) tagMap.set(tag, []);
          tagMap.get(tag)!.push(c);
        });
      });
      
      const tags = [...tagMap.entries()].filter(([, cs]) => cs.length > 0).slice(0, 6);
      const scaleFactor = getScaleFactor(tags.length * 3);
      const angleStep = (2 * Math.PI) / Math.max(tags.length, 1);
      
      tags.forEach(([tag, tagContacts], idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        const radius = 50 * scaleFactor;
        const groupX = centerX + Math.cos(angle) * radius;
        const groupY = centerY + Math.sin(angle) * radius * 0.7;
        
        const groupId = `tag-${tag}`;
        nodeMap.set(groupId, {
          id: groupId,
          type: 'group',
          label: tag.substring(0, 4),
          fullName: tag,
          x: groupX,
          y: groupY,
          color: '#a855f7',
          size: (14 + Math.min(tagContacts.length * 2, 8)) * scaleFactor,
        });
        
        tagContacts.slice(0, 4).forEach((contact, cIdx) => {
          const contactAngle = angle + ((cIdx - 1.5) * 0.4);
          const contactRadius = 28 * scaleFactor;
          const cx = groupX + Math.cos(contactAngle) * contactRadius;
          const cy = groupY + Math.sin(contactAngle) * contactRadius * 0.7;
          
          if (!nodeMap.has(contact.id)) {
            const typeColor = contactTypeConfig[contact.contact_type]?.color || 'text-muted-foreground';
            
            nodeMap.set(contact.id, {
              id: contact.id,
              type: 'contact',
              label: contact.name.split(' ')[0].substring(0, 2),
              fullName: contact.name,
              x: Math.max(20, Math.min(380, cx)),
              y: Math.max(15, Math.min(160, cy)),
              color: typeColor.includes('blue') ? '#3b82f6' : 
                     typeColor.includes('purple') ? '#a855f7' :
                     typeColor.includes('emerald') ? '#10b981' :
                     typeColor.includes('amber') ? '#f59e0b' : '#6b7280',
              size: 9 * scaleFactor,
            });
          }
          
          edgeMap.set(`${groupId}-${contact.id}`, { source: groupId, target: contact.id, strength: 1 });
        });
      });
    } else if (viewMode === 'project') {
      const projectMap = new Map<string, { name: string; contacts: Set<string> }>();
      
      interactions.forEach(i => {
        if (i.deal_id && i.deal) {
          if (!projectMap.has(i.deal_id)) {
            projectMap.set(i.deal_id, { name: i.deal.project_name, contacts: new Set() });
          }
          projectMap.get(i.deal_id)!.contacts.add(i.contact_id);
        }
      });
      
      const projects = [...projectMap.entries()].slice(0, 6);
      const scaleFactor = getScaleFactor(projects.length * 3);
      const angleStep = (2 * Math.PI) / Math.max(projects.length, 1);
      
      projects.forEach(([projectId, { name, contacts: projectContacts }], idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        const radius = 50 * scaleFactor;
        const groupX = centerX + Math.cos(angle) * radius;
        const groupY = centerY + Math.sin(angle) * radius * 0.7;
        
        const groupId = `project-${projectId}`;
        nodeMap.set(groupId, {
          id: groupId,
          type: 'group',
          label: name.substring(0, 4),
          fullName: name,
          x: groupX,
          y: groupY,
          color: '#10b981',
          size: (14 + Math.min(projectContacts.size * 2, 8)) * scaleFactor,
        });
        
        [...projectContacts].slice(0, 4).forEach((contactId, cIdx) => {
          const contact = contacts.find(c => c.id === contactId);
          if (!contact) return;
          
          const contactAngle = angle + ((cIdx - 1.5) * 0.4);
          const contactRadius = 28 * scaleFactor;
          const cx = groupX + Math.cos(contactAngle) * contactRadius;
          const cy = groupY + Math.sin(contactAngle) * contactRadius * 0.7;
          
          if (!nodeMap.has(contact.id)) {
            const typeColor = contactTypeConfig[contact.contact_type]?.color || 'text-muted-foreground';
            
            nodeMap.set(contact.id, {
              id: contact.id,
              type: 'contact',
              label: contact.name.split(' ')[0].substring(0, 2),
              fullName: contact.name,
              x: Math.max(20, Math.min(380, cx)),
              y: Math.max(15, Math.min(160, cy)),
              color: typeColor.includes('blue') ? '#3b82f6' : 
                     typeColor.includes('purple') ? '#a855f7' :
                     typeColor.includes('emerald') ? '#10b981' :
                     typeColor.includes('amber') ? '#f59e0b' : '#6b7280',
              size: 9 * scaleFactor,
            });
          }
          
          edgeMap.set(`${groupId}-${contact.id}`, { source: groupId, target: contact.id, strength: 1 });
        });
      });
    }
    
    // Resolve overlaps
    const resolvedNodes = resolveOverlaps([...nodeMap.values()], 8);
    
    return { nodes: resolvedNodes, edges: [...edgeMap.values()] };
  }, [contacts, interactions, viewMode]);

  const handleNodeClick = (nodeId: string) => {
    const contact = contacts.find(c => c.id === nodeId);
    if (contact) {
      onContactClick(contact);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        {t('Add contacts to see connections')}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* View Mode Selector */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        {(['all', 'company', 'tag', 'project'] as ViewMode[]).map(mode => {
          const labelMap: Record<ViewMode, string> = {
            all: t('All'),
            company: t('Company'),
            tag: t('Tag'),
            project: t('Project'),
          };
          return (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
              viewMode === mode 
                ? 'bg-foreground/10 text-foreground' 
                : 'text-muted-foreground/60 hover:text-muted-foreground'
            }`}
          >
            {labelMap[mode]}
          </button>
        );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          onClick={handleZoomOut}
          className="p-1 rounded text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-colors"
          title={t('Zoom out')}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded text-muted-foreground/60 hover:text-muted-foreground hover:bg-foreground/5 transition-colors"
          title={t('Zoom in')}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <svg 
        viewBox="0 0 400 176" 
        className="w-full h-full"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        <defs>
          {nodes.map(node => (
            <radialGradient key={`grad-${node.id}`} id={`grad-${node.id}`} cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={node.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={node.color} stopOpacity="0.05" />
            </radialGradient>
          ))}
          {/* Clip paths for company logos */}
          {nodes.filter(n => n.type === 'group' && n.logoUrl).map(node => (
            <clipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
              <circle r={node.size} />
            </clipPath>
          ))}
        </defs>
        
        {/* Edges */}
        {edges.map((edge, idx) => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;
          
          const opacity = 0.08 + Math.min(edge.strength * 0.06, 0.2);
          
          return (
            <line
              key={idx}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="currentColor"
              strokeOpacity={opacity}
              strokeWidth={0.5 + Math.min(edge.strength * 0.2, 1)}
            />
          );
        })}
        
        {/* Nodes */}
        {nodes.map(node => (
          <g
            key={node.id}
            style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
            className={`cursor-pointer ${node.type === 'contact' ? 'hover:opacity-80' : ''}`}
            onClick={() => node.type === 'contact' && handleNodeClick(node.id)}
          >
            {/* Outer glow */}
            <circle
              r={node.size + 3}
              fill={`url(#grad-${node.id})`}
            />
            {/* Main circle - no border */}
            <circle
              r={node.size}
              fill={node.type === 'group' 
                ? (node.color === '#94a3b8' ? '#f1f5f9' : `${node.color}20`) 
                : `${node.color}15`
              }
            />
            
            {/* Company logo or text */}
            {node.type === 'group' && node.logoUrl ? (
              <image
                href={node.logoUrl}
                x={-node.size * 0.7}
                y={-node.size * 0.7}
                width={node.size * 1.4}
                height={node.size * 1.4}
                clipPath={`url(#clip-${node.id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                textAnchor="middle"
                dy="0.35em"
                className={`fill-foreground pointer-events-none ${node.type === 'group' ? 'text-[7px] font-medium' : 'text-[7px] font-medium'}`}
                style={{ opacity: node.type === 'group' ? 0.7 : 0.75 }}
              >
                {node.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default ConnectionMap;
