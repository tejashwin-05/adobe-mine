"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Network, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GraphNode {
  id: string
  label: string
  size?: number
  color?: string
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  weight?: number
  label?: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface KnowledgeGraphProps {
  clusterId: string
  isVisible: boolean
  onClose: () => void
}

export function KnowledgeGraph({ clusterId, isVisible, onClose }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const { toast } = useToast()

  // Fetch graph data when component becomes visible
  useEffect(() => {
    if (isVisible && clusterId && !graphData) {
      fetchGraphData()
    }
  }, [isVisible, clusterId, graphData])

  const fetchGraphData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Fetching knowledge graph for cluster:", clusterId)

      const response = await fetch(`/api/v1/graph/${clusterId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch graph data: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Graph data received:", data)

      // Process and normalize the data
      const processedData: GraphData = {
        nodes: data.nodes.map((node: any, index: number) => ({
          id: node.id || `node-${index}`,
          label: node.label || node.name || `Concept ${index + 1}`,
          size: node.size || Math.random() * 20 + 10,
          color: node.color || getNodeColor(index),
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
          vx: 0,
          vy: 0,
        })),
        links: data.links.map((link: any) => ({
          source: link.source,
          target: link.target,
          weight: link.weight || 1,
          label: link.label || "",
        })),
      }

      setGraphData(processedData)

      toast({
        title: "Knowledge graph loaded",
        description: `Visualizing ${processedData.nodes.length} concepts and ${processedData.links.length} connections.`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load knowledge graph"
      console.error("[v0] Graph error:", err)
      setError(errorMessage)

      toast({
        title: "Failed to load knowledge graph",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getNodeColor = (index: number) => {
    const colors = [
      "#dc2626", // primary red
      "#f59e0b", // secondary golden
      "#10b981", // emerald
      "#3b82f6", // blue
      "#8b5cf6", // violet
      "#f97316", // orange
      "#06b6d4", // cyan
      "#84cc16", // lime
    ]
    return colors[index % colors.length]
  }

  // Simple force simulation using requestAnimationFrame
  useEffect(() => {
    if (!graphData || !svgRef.current) return

    let animationId: number
    const simulate = () => {
      setGraphData((prevData) => {
        if (!prevData) return prevData

        const nodes = [...prevData.nodes]
        const links = prevData.links

        // Apply forces
        nodes.forEach((node) => {
          // Center force
          const centerX = 300
          const centerY = 200
          const centerForce = 0.01
          node.vx = (node.vx || 0) + (centerX - (node.x || 0)) * centerForce
          node.vy = (node.vy || 0) + (centerY - (node.y || 0)) * centerForce

          // Repulsion between nodes
          nodes.forEach((other) => {
            if (node.id !== other.id) {
              const dx = (node.x || 0) - (other.x || 0)
              const dy = (node.y || 0) - (other.y || 0)
              const distance = Math.sqrt(dx * dx + dy * dy) || 1
              const force = 500 / (distance * distance)
              node.vx = (node.vx || 0) + (dx / distance) * force
              node.vy = (node.vy || 0) + (dy / distance) * force
            }
          })
        })

        // Link forces
        links.forEach((link) => {
          const source = nodes.find((n) => n.id === link.source)
          const target = nodes.find((n) => n.id === link.target)

          if (source && target) {
            const dx = (target.x || 0) - (source.x || 0)
            const dy = (target.y || 0) - (source.y || 0)
            const distance = Math.sqrt(dx * dx + dy * dy) || 1
            const targetDistance = 100
            const force = (distance - targetDistance) * 0.1

            const fx = (dx / distance) * force
            const fy = (dy / distance) * force

            source.vx = (source.vx || 0) + fx
            source.vy = (source.vy || 0) + fy
            target.vx = (target.vx || 0) - fx
            target.vy = (target.vy || 0) - fy
          }
        })

        // Update positions and apply damping
        nodes.forEach((node) => {
          node.vx = (node.vx || 0) * 0.9
          node.vy = (node.vy || 0) * 0.9
          node.x = (node.x || 0) + (node.vx || 0)
          node.y = (node.y || 0) + (node.vy || 0)

          // Keep nodes within bounds
          node.x = Math.max(20, Math.min(580, node.x))
          node.y = Math.max(20, Math.min(380, node.y))
        })

        return { ...prevData, nodes }
      })

      animationId = requestAnimationFrame(simulate)
    }

    animationId = requestAnimationFrame(simulate)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [graphData])

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
    console.log("[v0] Node selected:", node)
  }

  const handleNodeDrag = (node: GraphNode, event: React.MouseEvent) => {
    if (!graphData) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (event.clientX - rect.left) / zoom - pan.x
    const y = (event.clientY - rect.top) / zoom - pan.y

    setGraphData((prevData) => {
      if (!prevData) return prevData

      const nodes = prevData.nodes.map((n) => (n.id === node.id ? { ...n, x, y, vx: 0, vy: 0 } : n))

      return { ...prevData, nodes }
    })
  }

  const resetGraph = () => {
    setGraphData(null)
    setSelectedNode(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    fetchGraphData()
  }

  const zoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 3))
  const zoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.5))

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Concept Explorer
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Badge variant="secondary" className="font-sans">
                {Math.round(zoom * 100)}%
              </Badge>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetGraph}>
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex gap-4">
          {/* Graph Visualization */}
          <div className="flex-1 border rounded-lg bg-muted/20 relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-sm text-muted-foreground font-sans">Building knowledge graph...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <Alert className="max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Graph Error:</strong> {error}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {graphData && !isLoading && (
              <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 600 400" className="cursor-move">
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-muted-foreground" />
                  </marker>
                </defs>

                {/* Links */}
                <g>
                  {graphData.links.map((link, index) => {
                    const source = graphData.nodes.find((n) => n.id === link.source)
                    const target = graphData.nodes.find((n) => n.id === link.target)

                    if (!source || !target) return null

                    return (
                      <line
                        key={index}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="currentColor"
                        strokeWidth={Math.sqrt(link.weight || 1)}
                        className="text-muted-foreground"
                        markerEnd="url(#arrowhead)"
                        opacity={0.6}
                      />
                    )
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {graphData.nodes.map((node) => (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.size}
                        fill={node.color}
                        stroke={selectedNode?.id === node.id ? "#000" : "#fff"}
                        strokeWidth={selectedNode?.id === node.id ? 3 : 2}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleNodeClick(node)}
                        onMouseDown={(e) => {
                          const handleMouseMove = (event: MouseEvent) => {
                            handleNodeDrag(node, event as any)
                          }
                          const handleMouseUp = () => {
                            document.removeEventListener("mousemove", handleMouseMove)
                            document.removeEventListener("mouseup", handleMouseUp)
                          }
                          document.addEventListener("mousemove", handleMouseMove)
                          document.addEventListener("mouseup", handleMouseUp)
                        }}
                      />
                      <text
                        x={node.x}
                        y={node.y! + (node.size! + 15)}
                        textAnchor="middle"
                        className="text-xs font-sans fill-current pointer-events-none"
                        fontSize="10"
                      >
                        {node.label.length > 12 ? `${node.label.slice(0, 12)}...` : node.label}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            )}
          </div>

          {/* Node Details Panel */}
          <div className="w-64 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-sans">Graph Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {graphData && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Concepts:</span>
                      <span className="font-medium">{graphData.nodes.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Connections:</span>
                      <span className="font-medium">{graphData.links.length}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {selectedNode && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-sans">Selected Concept</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                      <span className="font-medium text-sm">{selectedNode.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click and drag nodes to explore relationships between concepts in your document cluster.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-sans">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Click nodes to select them</li>
                  <li>• Drag nodes to reposition</li>
                  <li>• Use zoom controls to explore</li>
                  <li>• Reset to reload the graph</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
