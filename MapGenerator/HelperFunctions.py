import math
from shapely.geometry import LineString
import MapComponents
import Periphery

def deleteEmptyDictionaryKeys(dictionary):
    for key in dictionary.copy().keys():
        try:
            if len(dictionary[key]) < 1:
                del dictionary[key]
        except: 
            pass
    return dictionary

def intersect(segment1_v1, segment1_v2, segment2_v1, segment2_v2):
    line1 = LineString([segment1_v1, segment1_v2])
    line2 = LineString([segment2_v1, segment2_v2])
    if line1.intersects(line2):
        return True
    else:
        return False


def distance(vertex1, vertex2):
    return math.sqrt((vertex1['x'] - vertex2['x']) ** 2 + ((vertex1['y'] - vertex2['y']) ** 2))


def generateMirroredDependencies(graph, selectedNode):
    dependencies = selectedNode['dependentNodeIds']
    dependencies.append(MapComponents.Dependency(selectedNode['id'], graph))
    counter = 0

    for baseDependency in dependencies:
        baseGraph = baseDependency.navigationGraph
        node = baseGraph.getNodeById(baseDependency.nodeId)
        for dependency in dependencies:
            if baseDependency != dependency:
                graph = dependency.navigationGraph
                baseGraph.addDependencyToNode(node, dependency.navigationGraph.getNodeById(dependency.nodeId), graph)


def generateDependenciesForToCloseNodes(nodes, radius=None):
    if radius is not None:
        for currentNode in nodes:
            for possibleOverlappingNode in nodes:
                if distance(currentNode, possibleOverlappingNode) <= radius:
                    if 'dependentNodeIds' in currentNode:
                        if possibleOverlappingNode['id'] not in currentNode['dependentNodeIds']:
                            currentNode['dependentNodeIds'].append(possibleOverlappingNode['id'])
                    else:
                        currentNode['dependentNodeIds'] = [possibleOverlappingNode['id']]
                    if 'dependentNodeIds' in possibleOverlappingNode:
                        if currentNode['id'] not in possibleOverlappingNode['dependentNodeIds']:
                            possibleOverlappingNode['dependentNodeIds'].append(currentNode['id'])
                    else:
                        possibleOverlappingNode['dependentNodeIds'] = [currentNode['id']]
    return nodes


def generateDependenciesForIntersectingEdges(nodes, edges):
    #for firstEdge in edges:
    numberOfPossiblesIntersections = len(edges)*len(edges)
    for firstEdgeIndex in range(0, len(edges)):
        firstEdge_startNode, firstEdge_endNode = getEdgeNodes(nodes, edges[firstEdgeIndex])
        for secondEdgeIndex in range(firstEdgeIndex+1, len(edges)):
            secondEdge_startNode, secondEdge_endNode = getEdgeNodes(nodes, edges[secondEdgeIndex])
            if intersect((firstEdge_startNode['x'], firstEdge_startNode['y']), (firstEdge_endNode['x'], firstEdge_endNode['y']),
                                         (secondEdge_startNode['x'], secondEdge_startNode['y']),
                                         (secondEdge_endNode['x'], secondEdge_endNode['y'])):
                #print('Edge', firstEdge['id'], 'and edge', secondEdge['id'], 'intersect!')
                if firstEdge_startNode['id'] != secondEdge_startNode['id'] and firstEdge_startNode['id'] != secondEdge_endNode['id'] and firstEdge_endNode['id'] != \
                        secondEdge_startNode['id'] and firstEdge_endNode['id'] != secondEdge_endNode['id']:
                    if 'dependentNodeIds' in firstEdge_endNode:
                        if secondEdge_endNode['id'] not in firstEdge_endNode['dependentNodeIds']:
                            firstEdge_endNode['dependentNodeIds'].append(secondEdge_endNode['id'])
                    else:
                        firstEdge_endNode['dependentNodeIds'] = [secondEdge_endNode['id']]
                    if 'dependentNodeIds' in secondEdge_endNode:
                        if firstEdge_endNode['id'] not in secondEdge_endNode['dependentNodeIds']:
                            secondEdge_endNode['dependentNodeIds'].append(firstEdge_endNode['id'])
                    else:
                        secondEdge_endNode['dependentNodeIds'] = [firstEdge_endNode['id']]
        print(firstEdgeIndex*len(edges), 'of', numberOfPossiblesIntersections, 'done')
    return nodes


def clearSelfDependencies(nodes):
    for node in nodes:
        if node['id'] in node['dependentNodeIds']:
            node['dependentNodeIds'].remove(node['id'])


def getEdgeNodes(nodes, edge):
    startNode = next(item for item in nodes if item['id'] == edge['startNodeId'])
    endNode = next(item for item in nodes if item['id'] == edge['endNodeId'])
    return startNode, endNode


def accessNodeDistanceCheck(map, minDist=1.87):
    print('Checking all stations...')
    for station1 in map._stations:
        for accessNode1 in station1._accessNodes:
            graph1 = accessNode1._graph
            node1 = graph1.getNodeById(nodeId=accessNode1.getNodeId())
        for station2 in map._stations:
            for accessNode2 in station2._accessNodes:
                graph2 = accessNode2._graph
                node2 = graph2.getNodeById(nodeId=accessNode2.getNodeId())
                if station1._stationId != station2._stationId or graph1 != graph2:
                    dist = math.sqrt((node1['x'] - node2['x']) ** 2 + ((node1['y'] - node2['y']) ** 2))
                    if dist <= minDist:
                        print('On', graph1.getId(), 'node', node1['id'], 'has only a distance of', dist, 'to', node2['id'], 'on', graph2.getId())
                        graph1.addDependencyToNode(node1, node2, graph2)
                        graph2.addDependencyToNode(node2, node1, graph1)

    print('Done!')


def accessNodeDistanceCheckRemove(map, minDist=1.87):
    print('Checking all stations...')
    for station1 in map._stations:
        for accessNode1 in station1._accessNodes:
            graph1 = accessNode1._graph
            node1 = graph1.getNodeById(nodeId=accessNode1.getNodeId())
        for station2 in map._stations:
            for accessNode2 in station2._accessNodes:
                graph2 = accessNode2._graph
                node2 = graph2.getNodeById(nodeId=accessNode2.getNodeId())
                if station1._stationId != station2._stationId or graph1 != graph2:
                    dist = math.sqrt((node1['x'] - node2['x']) ** 2 + ((node1['y'] - node2['y']) ** 2))
                    if dist <= minDist:
                        print('On', graph1.getId(), 'node', node1['id'], 'has only a distance of', dist, 'to', node2['id'], 'on', graph2.getId())
                        graph1.removeDependencyFromNode(node1, node2, graph2)
                        graph2.removeDependencyFromNode(node2, node1, graph1)

    print('Done!')
