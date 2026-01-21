import type { Dependency } from '@/types'

/**
 * Build an adjacency list from dependencies
 */
function buildAdjacencyList(dependencies: Dependency[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  for (const dep of dependencies) {
    if (!graph.has(dep.predecessor_id)) {
      graph.set(dep.predecessor_id, new Set())
    }
    graph.get(dep.predecessor_id)!.add(dep.successor_id)
  }

  return graph
}

/**
 * Check if adding a new dependency would create a cycle
 * Uses DFS to check if successor can reach predecessor
 */
export function wouldCreateCycle(
  dependencies: Dependency[],
  newPredecessorId: string,
  newSuccessorId: string
): boolean {
  // Self-referential dependency is always a cycle
  if (newPredecessorId === newSuccessorId) {
    return true
  }

  // Build adjacency list including the proposed new edge
  const graph = buildAdjacencyList(dependencies)

  // Add the proposed edge
  if (!graph.has(newPredecessorId)) {
    graph.set(newPredecessorId, new Set())
  }
  graph.get(newPredecessorId)!.add(newSuccessorId)

  // DFS from successor to see if we can reach predecessor
  const visited = new Set<string>()
  const stack = [newSuccessorId]

  while (stack.length > 0) {
    const current = stack.pop()!

    if (current === newPredecessorId) {
      return true // Found a cycle
    }

    if (visited.has(current)) {
      continue
    }

    visited.add(current)

    const neighbors = graph.get(current)
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor)
        }
      }
    }
  }

  return false
}

/**
 * Get all predecessors (direct and transitive) for a task
 */
export function getAllPredecessors(dependencies: Dependency[], taskId: string): Set<string> {
  const predecessors = new Set<string>()
  const visited = new Set<string>()

  // Build reverse adjacency list (successor -> predecessors)
  const reverseGraph = new Map<string, Set<string>>()
  for (const dep of dependencies) {
    if (!reverseGraph.has(dep.successor_id)) {
      reverseGraph.set(dep.successor_id, new Set())
    }
    reverseGraph.get(dep.successor_id)!.add(dep.predecessor_id)
  }

  // BFS to find all predecessors
  const queue = [taskId]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (visited.has(current)) {
      continue
    }
    visited.add(current)

    const directPredecessors = reverseGraph.get(current)
    if (directPredecessors) {
      for (const pred of directPredecessors) {
        predecessors.add(pred)
        if (!visited.has(pred)) {
          queue.push(pred)
        }
      }
    }
  }

  return predecessors
}

/**
 * Get all successors (direct and transitive) for a task
 */
export function getAllSuccessors(dependencies: Dependency[], taskId: string): Set<string> {
  const successors = new Set<string>()
  const visited = new Set<string>()
  const graph = buildAdjacencyList(dependencies)

  // BFS to find all successors
  const queue = [taskId]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (visited.has(current)) {
      continue
    }
    visited.add(current)

    const directSuccessors = graph.get(current)
    if (directSuccessors) {
      for (const succ of directSuccessors) {
        successors.add(succ)
        if (!visited.has(succ)) {
          queue.push(succ)
        }
      }
    }
  }

  return successors
}

/**
 * Get tasks that cannot be selected as predecessors for a given task
 * (because it would create a cycle)
 */
export function getInvalidPredecessors(dependencies: Dependency[], taskId: string): Set<string> {
  const invalid = new Set<string>()

  // Can't be own predecessor
  invalid.add(taskId)

  // Can't have any successor as predecessor (would create cycle)
  const successors = getAllSuccessors(dependencies, taskId)
  for (const succ of successors) {
    invalid.add(succ)
  }

  return invalid
}

/**
 * Get direct predecessors for a task
 */
export function getDirectPredecessors(dependencies: Dependency[], taskId: string): string[] {
  return dependencies.filter((d) => d.successor_id === taskId).map((d) => d.predecessor_id)
}

/**
 * Get direct successors for a task
 */
export function getDirectSuccessors(dependencies: Dependency[], taskId: string): string[] {
  return dependencies.filter((d) => d.predecessor_id === taskId).map((d) => d.successor_id)
}
