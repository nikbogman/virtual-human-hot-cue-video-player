import { createContext, useContext, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type NodeProps,
  type NodeTypes,
  type NodeChange,
  type EdgeChange,
  type Connection,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CueCardFace from './CueCardFace'
import CueCardEdit from './CueCardEdit'
import { cueCardBase, cueHighlightClass } from '../lib/cueStyle'
import type { HotCue } from '../types'
import type { CuePosition, CueLink } from '../hooks/useCueGraph'

interface CueNodeData extends Record<string, unknown> {
  cue: HotCue
  index: number
}
type CueFlowNode = Node<CueNodeData, 'cueNode'>

// Frequently-changing state (highlight, which card is being edited) is read from
// context rather than node.data, so dragging/playing never has to rewrite the
// React Flow node array.
interface CueGraphCtx {
  cues: HotCue[]
  playingId: string | null
  nextIds: Set<string>
  editingIndex: number | null
  onPlay: (cue: HotCue) => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onUpdate: (index: number, patch: Partial<HotCue>) => void
  onClose: () => void
}
const Ctx = createContext<CueGraphCtx | null>(null)

function CueNode({ data }: NodeProps<CueFlowNode>) {
  const ctx = useContext(Ctx)!
  const { cue, index } = data

  if (ctx.editingIndex === index) {
    return (
      <div className="nodrag nopan cursor-default">
        <Handle type="target" position={Position.Top} />
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
        <Handle type="source" position={Position.Bottom} />
        <CueCardEdit
          cue={cue}
          index={index}
          cues={ctx.cues}
          onUpdate={(patch) => ctx.onUpdate(index, patch)}
          onDelete={() => ctx.onDelete(index)}
          onClose={ctx.onClose}
        />
      </div>
    )
  }

  const isPlaying = ctx.playingId === cue.id
  const isNext = ctx.nextIds.has(cue.id)

  return (
    <div
      className={`${cueCardBase} ${cueHighlightClass(isPlaying, isNext)}`}
      title={cue.fileName}
      onClick={() => ctx.onPlay(cue)}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} />
      <CueCardFace cue={cue} onEdit={() => ctx.onEdit(index)} onDelete={() => ctx.onDelete(index)} />
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

const nodeTypes: NodeTypes = { cueNode: CueNode }

// Lay out cues that don't have a saved position yet in a simple grid.
function gridPosition(index: number): CuePosition {
  const COLS = 4
  return { x: (index % COLS) * 250 + 40, y: Math.floor(index / COLS) * 210 + 40 }
}

interface Props {
  cues: HotCue[]
  positions: Record<string, CuePosition>
  links: CueLink[]
  playingId: string | null
  nextIds: Set<string>
  editingIndex: number | null
  onPlay: (cue: HotCue) => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onUpdate: (index: number, patch: Partial<HotCue>) => void
  onClose: () => void
  setPosition: (id: string, pos: CuePosition) => void
  addLink: (source: string, target: string) => void
  removeLink: (source: string, target: string) => void
}

export interface CueGraphHandle {
  deleteSelected: () => void
}

export default forwardRef<CueGraphHandle, Props>(function CueGraph({
  cues,
  positions,
  links,
  playingId,
  nextIds,
  editingIndex,
  onPlay,
  onEdit,
  onDelete,
  onUpdate,
  onClose,
  setPosition,
  addLink,
  removeLink,
}: Props, ref) {
  // Live drag offsets so node dragging stays smooth; only persisted on drag stop.
  const [drag, setDrag] = useState<Record<string, CuePosition>>({})

  const nodes = useMemo<CueFlowNode[]>(
    () =>
      cues.map((cue, index) => ({
        id: cue.id,
        type: 'cueNode',
        position: drag[cue.id] ?? positions[cue.id] ?? gridPosition(index),
        data: { cue, index },
        deletable: false, // cues are removed via the card's delete button, not Backspace
      })),
    [cues, positions, drag],
  )

  const edges = useMemo(() => {
    const ids = new Set(cues.map((c) => c.id))
    return links
      .filter((l) => ids.has(l.source) && ids.has(l.target))
      .map((l) => ({
        id: `${l.source}->${l.target}`,
        source: l.source,
        target: l.target,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
  }, [links, cues])

  const [nodes, setNodes, internalOnNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, internalOnEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set())

  useImperativeHandle(ref, () => ({
    deleteSelected,
  }))

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete') {
        e.preventDefault()
        deleteSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeIds, selectedEdgeIds, nodes, edges, cues])

  function deleteSelected() {
    // Remove selected nodes
    for (const nodeId of selectedNodeIds) {
      const cueIndex = cues.findIndex((c) => c.id === nodeId)
      if (cueIndex !== -1) {
        onDelete(cueIndex)
      }
    }

    // Remove selected edges
    for (const edgeId of selectedEdgeIds) {
      const [source, target] = edgeId.split('->')
      if (source && target) {
        removeLink(source, target)
      }
    }

    setSelectedNodeIds(new Set())
    setSelectedEdgeIds(new Set())
  }

  function onNodesChange(changes: NodeChange<CueFlowNode>[]) {
    internalOnNodesChange(changes)

    for (const ch of changes) {
      if (ch.type === 'position' && ch.position && !ch.dragging) {
        setPosition(ch.id, ch.position)
      } else if (ch.type === 'select') {
        setSelectedNodeIds((prev) => {
          const next = new Set(prev)
          if (ch.selected) {
            next.add(ch.id)
          } else {
            next.delete(ch.id)
          }
          return next
        })
      }
    }
  }

  function onEdgesChange(changes: EdgeChange[]) {
    internalOnEdgesChange(changes)

    for (const ch of changes) {
      if (ch.type === 'remove') {
        const [source, target] = ch.id.split('->')
        if (source && target) removeLink(source, target)
      } else if (ch.type === 'select') {
        setSelectedEdgeIds((prev) => {
          const next = new Set(prev)
          if (ch.selected) {
            next.add(ch.id)
          } else {
            next.delete(ch.id)
          }
          return next
        })
      }
    }
  }

  function onConnect(c: Connection) {
    if (c.source && c.target) addLink(c.source, c.target)
  }

  const ctxValue: CueGraphCtx = {
    cues,
    playingId,
    nextIds,
    editingIndex,
    onPlay,
    onEdit,
    onDelete,
    onUpdate,
    onClose,
  }

  return (
    <div className="w-full h-full bg-[#111]">
      <Ctx.Provider value={ctxValue}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          colorMode="dark"
          style={{ width: '100%', height: '100%' }}
          onInit={(instance) => instance.fitView({ padding: 0.12, duration: 0 })}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </Ctx.Provider>
    </div>
  )
})
