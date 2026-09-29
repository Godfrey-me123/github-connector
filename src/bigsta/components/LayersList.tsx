import React, { useState, useRef, useEffect } from 'react';
import {
  Type,
  Image as ImageIcon,
  Square,
  Circle as CircleIcon,
  Barcode as BarcodeIcon,
  QrCode,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  UserCheck,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { Layer } from '../types';

interface LayersListProps {
  onLayerSelected?: () => void;
  isMobile?: boolean;
}

export const LayersList: React.FC<LayersListProps> = ({ onLayerSelected, isMobile = false }) => {
  const {
    currentTemplate,
    selectedLayerIds,
    selectLayer,
    updateLayer,
    deleteSelectedLayers,
    duplicateSelectedLayers,
    reorderLayer,
    toggleLayerVisibility,
    toggleLayerLock,
  } = useTemplateStore();

  const [longPressMenuLayerId, setLongPressMenuLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const layerItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto scroll to selected layer
  useEffect(() => {
    if (selectedLayerIds.length > 0) {
      const activeId = selectedLayerIds[0];
      const el = layerItemRefs.current[activeId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedLayerIds]);

  const handleTouchStart = (layerId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setLongPressMenuLayerId(layerId);
      selectLayer(layerId, false);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLayerClick = (layerId: string, shiftKey: boolean) => {
    selectLayer(layerId, shiftKey);
    if (onLayerSelected) {
      onLayerSelected();
    }
  };

  const handleStartRename = (layer: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleSaveRename = (layerId: string) => {
    if (editingName.trim()) {
      updateLayer(layerId, { name: editingName.trim() });
    }
    setEditingLayerId(null);
  };

  const renderThumbnail = (layer: Layer) => {
    switch (layer.type) {
      case 'text':
        return (
          <div
            className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400 overflow-hidden select-none flex-shrink-0"
            style={{ color: layer.color || '#60a5fa' }}
          >
            {layer.text?.substring(0, 2) || 'Aa'}
          </div>
        );
      case 'image':
        return layer.src ? (
          <img
            src={layer.src}
            alt=""
            className="w-8 h-8 rounded object-cover border border-slate-700 bg-slate-800 flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 flex-shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
        );
      case 'placeholder':
        return (
          <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'shape':
        return (
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-pink-400 flex-shrink-0">
            {layer.shapeType === 'circle' ? (
              <CircleIcon className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </div>
        );
      case 'barcode':
        return (
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 flex-shrink-0">
            <BarcodeIcon className="w-4 h-4" />
          </div>
        );
      case 'qrcode':
        return (
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 flex-shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
            <Square className="w-4 h-4" />
          </div>
        );
    }
  };

  const getLayerTypeBadge = (type: string) => {
    switch (type) {
      case 'text':
        return <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono font-bold">TEXT</span>;
      case 'image':
        return <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 font-mono font-bold">IMAGE</span>;
      case 'placeholder':
        return <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">HOLDER</span>;
      case 'shape':
        return <span className="text-[9px] px-1 py-0.2 rounded bg-pink-500/10 text-pink-400 font-mono font-bold">SHAPE</span>;
      case 'barcode':
        return <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono font-bold">BARCODE</span>;
      case 'qrcode':
        return <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500/10 text-teal-400 font-mono font-bold">QR</span>;
      default:
        return <span className="text-[9px] px-1 py-0.2 rounded bg-slate-500/10 text-slate-400 font-mono font-bold">ITEM</span>;
    }
  };

  const layersReversed = [...currentTemplate.layers].reverse();

  return (
    <div className="space-y-2">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <span className="font-semibold text-slate-400">
          Layer Stack ({currentTemplate.layers.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={duplicateSelectedLayers}
            disabled={selectedLayerIds.length === 0}
            className="min-h-[36px] px-2 sm:min-h-0 sm:p-1 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-30 flex items-center gap-1 transition-colors"
            title="Duplicate Selected"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Duplicate</span>
          </button>
          <button
            onClick={deleteSelectedLayers}
            disabled={selectedLayerIds.length === 0}
            className="min-h-[36px] px-2 sm:min-h-0 sm:p-1 hover:bg-red-500/20 text-red-400 rounded disabled:opacity-30 flex items-center gap-1 transition-colors"
            title="Delete Selected"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Layer Items List */}
      {layersReversed.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-500">
          No layers added yet. Add elements to begin customizing your card.
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-14rem)] sm:max-h-none">
          {layersReversed.map((layer, idx) => {
            const isSelected = selectedLayerIds.includes(layer.id);
            const isEditing = editingLayerId === layer.id;

            return (
              <div
                key={`${layer.id}-${idx}`}
                ref={(el) => {
                  layerItemRefs.current[layer.id] = el;
                }}
                onClick={(e) => handleLayerClick(layer.id, e.shiftKey)}
                onTouchStart={() => handleTouchStart(layer.id)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setLongPressMenuLayerId(layer.id);
                  selectLayer(layer.id, false);
                }}
                className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all min-h-[48px] select-none ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800/90'
                }`}
              >
                {/* Left: Thumbnail, Type & Name */}
                <div className="flex items-center gap-2.5 truncate pr-2 flex-1">
                  {renderThumbnail(layer)}

                  <div className="flex flex-col truncate flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {getLayerTypeBadge(layer.type)}
                      {layer.locked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
                      {layer.hidden && <EyeOff className="w-2.5 h-2.5 text-red-400" />}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(layer.id);
                            if (e.key === 'Escape') setEditingLayerId(null);
                          }}
                          autoFocus
                          className="bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded border border-blue-500 focus:outline-none w-full"
                        />
                        <button
                          onClick={() => handleSaveRename(layer.id)}
                          className="p-1 text-emerald-400 hover:bg-slate-700 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onDoubleClick={(e) => handleStartRename(layer, e)}
                        className="font-medium text-slate-200 truncate cursor-text"
                        title="Double-click to rename"
                      >
                        {layer.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Reorder Up/Down */}
                  <button
                    onClick={() => reorderLayer(layer.id, 'up')}
                    className="min-h-[36px] min-w-[32px] sm:min-h-0 sm:min-w-0 p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Bring Forward"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => reorderLayer(layer.id, 'down')}
                    className="min-h-[36px] min-w-[32px] sm:min-h-0 sm:min-w-0 p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Send Backward"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Visibility */}
                  <button
                    onClick={() => toggleLayerVisibility(layer.id)}
                    className="min-h-[36px] min-w-[32px] sm:min-h-0 sm:min-w-0 p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title={layer.hidden ? 'Show Layer' : 'Hide Layer'}
                  >
                    {layer.hidden ? (
                      <EyeOff className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Toggle Lock */}
                  <button
                    onClick={() => toggleLayerLock(layer.id)}
                    className="min-h-[36px] min-w-[32px] sm:min-h-0 sm:min-w-0 p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                    {layer.locked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                    )}
                  </button>

                  {/* Long press / More actions menu button */}
                  <button
                    onClick={() => setLongPressMenuLayerId(layer.id)}
                    className="min-h-[36px] min-w-[30px] sm:min-h-0 sm:min-w-0 p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    title="More actions"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Long Press / More Actions Modal / Bottom Sheet */}
      {longPressMenuLayerId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setLongPressMenuLayerId(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-4 text-xs space-y-3 shadow-2xl animate-in slide-in-from-bottom-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200">Layer Options</span>
              <button
                onClick={() => setLongPressMenuLayerId(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  reorderLayer(longPressMenuLayerId, 'top');
                  setLongPressMenuLayerId(null);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 flex items-center gap-2 font-medium"
              >
                <ArrowUp className="w-4 h-4 text-blue-400" />
                <span>Bring to Front</span>
              </button>
              <button
                onClick={() => {
                  reorderLayer(longPressMenuLayerId, 'bottom');
                  setLongPressMenuLayerId(null);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 flex items-center gap-2 font-medium"
              >
                <ArrowDown className="w-4 h-4 text-blue-400" />
                <span>Send to Back</span>
              </button>

              <button
                onClick={() => {
                  toggleLayerLock(longPressMenuLayerId);
                  setLongPressMenuLayerId(null);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 flex items-center gap-2 font-medium"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Toggle Lock</span>
              </button>

              <button
                onClick={() => {
                  toggleLayerVisibility(longPressMenuLayerId);
                  setLongPressMenuLayerId(null);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 flex items-center gap-2 font-medium"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Toggle Visibility</span>
              </button>

              <button
                onClick={() => {
                  duplicateSelectedLayers();
                  setLongPressMenuLayerId(null);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 flex items-center gap-2 font-medium"
              >
                <Copy className="w-4 h-4 text-purple-400" />
                <span>Duplicate Layer</span>
              </button>

              <button
                onClick={() => {
                  deleteSelectedLayers();
                  setLongPressMenuLayerId(null);
                }}
                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-2 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Layer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
