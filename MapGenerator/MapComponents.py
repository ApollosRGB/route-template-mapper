import MapGeneratorEditor
import IdManagement
import Periphery
import ControlComponents
import HelperFunctions
import MapGeneratorNURBS
import math
import copy
import dataclasses
from typing import TypeVar, Union
from Periphery import WaitingSpot


class Map:
    def __init__(self, mapId=None, mapName=None, mapDescription=None, withFirstGraph=True):
        self._mapId = mapId
        self._mapName = mapName
        self._mapDescription = mapDescription
        self._coordinateSystem = self.createDefaultCoordinateSystem()
        self._longitude = 0.0
        self._latitude = 0.0
        self.navigationGraphs = list()
        self._waitingSpots = list()
        self._stations = list()
        self._groups = list()
        self._trafficLights = list()
        self._chargingStations = list()
        self._limitedCapacityAreas = list()
        self._areas = list()
        self._emergencyDetectors = list()
        self._newGraphCounter = 0
        if withFirstGraph:
            self.createNavigationGraph(newGraphId=None)

    @property
    def mapId(self):
        return self._mapId

    @mapId.setter
    def mapId(self, newMapId):
        self._mapId = str(newMapId)

    @property
    def mapName(self):
        return self._mapName

    @mapName.setter
    def mapName(self, newMapName):
        self._mapName = str(newMapName)

    @property
    def longitude(self):
        return self._longitude

    @longitude.setter
    def longitude(self, newLongitude):
        if isinstance(newLongitude, float):
            if -180.0 <= newLongitude <= 180.0:
                self._longitude = newLongitude
            else:
                self._longitude = -180.0 if newLongitude < -180.0 else 180.0

    @property
    def latitude(self):
        return self._latitude

    @latitude.setter
    def latitude(self, newLatitude):
        if isinstance(newLatitude, float):
            if -90.0 <= newLatitude <= 90.0:
                self._latitude = newLatitude
            else:
                self._latitude = -90.0 if newLatitude < -90.0 else 90.0

    @staticmethod
    def createDefaultCoordinateSystem():
        coordinateSystem = dict(longitude=0.0, latitude=0.0, orientationXAxisX=1.0, orientationXAxisY=0.0,
                                orientationXAxisZ=0.0, orientationYAxisX=0.0, orientationYAxisY=1.0,
                                orientationYAxisZ=0.0, orientationZAxisX=0.0, orientationZAxisY=0.0,
                                orientationZAxisZ=1.0)
        return coordinateSystem

    def getCoordinateSystem(self):
        return self._coordinateSystem

    def createNavigationGraph(self, newGraphId=None):
        if newGraphId is None:
            newGraphId = 'newGraph'+str(self._newGraphCounter)
            self._newGraphCounter += 1
        self.navigationGraphs.append(NavigationGraph(graphId=str(newGraphId)))
        return self.navigationGraphs[-1]

    def addNavigationGraph(self, graph):
        self.navigationGraphs.append(graph)
        return self.navigationGraphs[-1]

    def deleteNavigationGraph(self, graph):
        for station in self._stations:
            station.deleteAllNodeAssignmentsOfGraph(graph.getId())
        self.navigationGraphs.remove(graph)

    def getNavigationGraphList(self):
        return self.navigationGraphs
    
    def addWaitingSpot(self, waitingSpot):
        self._waitingSpots.append(WaitingSpot(waitingSpot['id'], waitingSpot['nodes']))
        return self._waitingSpots
    
    def findWaitingSpot(self, waitingSpotId):
        for ws in self._waitingSpots:
            if ws._id == waitingSpotId:
                return ws

    def getWaitingSpots(self):
        return self._waitingSpots

    def hasNavigationGraph(self):
        if self.navigationGraphs:
            return True
        else:
            return False

    def getNavigationGraphById(self, graphId):
        for graph in self.navigationGraphs:
            if graph._graphId == graphId:
                return graph
        return None

    def convertToOldMapModel(self):
        pass

    def deleteNode(self, nodeToDelete, nodeGraph):
        possibleNodeDependency = Dependency(nodeId=nodeToDelete['id'], navGraph=nodeGraph)
        for graph in self.navigationGraphs:
            for node in graph.getNodes():
                if 'dependentNodeIds' in node and possibleNodeDependency in node['dependentNodeIds']:
                    graph.removeDependencyFromNode(node, nodeToDelete, nodeGraph)
        nodeGraph.deleteNode(nodeToDelete)

    def removeAllDependenciesFromNodes(self):
        for graph in self.navigationGraphs:
            for node in graph.getNodes():
                if 'dependentNodeIds' in node:
                    node.pop('dependentNodeIds')

    def deleteAccessNode(self, graph, node):
        for station in self._stations:
            if station.hasAccessNode(graph.getId(), node['id']):
                station.deleteNodeAssignment(graph.getId(), node['id'])

    def createStation(self, x, y, stationId='station') -> Periphery.HandlingStation:
        newStation = Periphery.HandlingStation(x=x, y=y, stationId=stationId)
        self._stations.append(newStation)
        return newStation

    def deleteStation(self, station):
        for group in self._groups:
            group.removeStation(station)
        self._stations.remove(station)

    def updateStationId(self, selectedStation, stationId):
        for station in self._stations:
            if station != selectedStation and station.getId() == stationId:
                return False
        selectedStation.setId(stationId)
        return True

    @staticmethod
    def isStation(station): #ToDo Also check for id exists
        return isinstance(station, Periphery.HandlingStation)

    def getStationById(self, stationId) -> Union[Periphery.HandlingStation, None]:
        for station in self._stations:
            if station.getId() == stationId:
                return station
        return None

    def createGroup(self, groupId='newGroup') -> Periphery.HandlingStationGroup:
        newGroup = Periphery.HandlingStationGroup(groupId=groupId)
        self._groups.append(newGroup)
        return self._groups[-1]

    def deleteGroup(self): #ToDo: Missing
        pass

    def getChargingStationById(self, chargerId) -> Union[Periphery.ChargingStation, None]:
        for station in self._chargingStations:
            if station.getId() == chargerId:
                return station
        return None

    def getHandlingStationGroups(self):
        return self._groups

    def getTrafficLights(self):
        return self._trafficLights

    def getChargingStations(self):
        return self._chargingStations

    def getGroupById(self, groupId):
        for group in self._groups:
            if group.getId() == groupId:
                return group
        return False

    def addStationToGroupById(self, group, stationId):
        station = self.getStationById(stationId)
        if station is not None:
            group.addStation(station)
        else:
            print('Station does not exist!')

    def createTrafficLight(self, x, y, lightId='light'):
        newTrafficLight = Periphery.TrafficLight(x=x, y=y, trafficLightId=lightId)
        self._trafficLights.append(newTrafficLight)
        return newTrafficLight

    def deleteTrafficLight(self, light):
        self._trafficLights.remove(light)

    def updateTrafficLightId(self, selectedLight, lightId):
        for light in self._trafficLights:
            if light != selectedLight and light.getId() == lightId:
                return False
        selectedLight.setId(lightId)
        return True

    @staticmethod
    def isTrafficLight(light): #ToDo also check for id
        return isinstance(light, Periphery.TrafficLight)

    def trafficLightsOutOfList(self, lightsList):
        for light in lightsList:
            self._trafficLights.append(Periphery.TrafficLight(trafficLightId=light['id'], x=light['x'], y=light['y']))

    @staticmethod
    def isChargingStation(charger):
        return isinstance(charger, Periphery.ChargingStation)

    def createChargingStation(self, x, y, chargerId='charger'):
        newStation = Periphery.ChargingStation(x=x, y=y, stationId=chargerId)
        self._chargingStations.append(newStation)
        return self._chargingStations[-1]

    def deleteChargingStation(self, station):
        self._chargingStations.remove(station)

    def updateChargingStationId(self, selectedCharger, chargerId):
        for charger in self._chargingStations:
            if charger != selectedCharger and charger.getId() == chargerId:
                return False
        selectedCharger.setId(chargerId)
        return True

    def createLimitedCapacityArea(self, lcaId='newArea', capacity=1):
        newArea = ControlComponents.LimitedCapacityArea(identifier=lcaId, capacity=capacity)
        self._limitedCapacityAreas.append(newArea)
        return newArea

    def getLimitedCapacityAreas(self):
        return self._limitedCapacityAreas

    def createArea(self, areaId='newArea'):
        newArea = ControlComponents.Area(name=areaId)
        self._areas.append(newArea)
        return newArea

    def getAreas(self):
        return self._areas

    def getAreaByName(self, name):
        for area in self._areas:
            if area.name == name:
                return area
        return None

    def createEmergencyDetector(self, name='newDetector'):
        newDetector = ControlComponents.EmergencyDetector(name=name)
        self._emergencyDetectors.append(newDetector)
        return newDetector

    def getEmergencyDetectors(self):
        return self._emergencyDetectors

    def groupsAndStationOutOfDict(self, groupAndStationDict): #ToDo: Rework to fit to multiple navigation graphs
        for group in groupAndStationDict:
            self._groups.append(Periphery.HandlingStationGroup(groupId=group['id']))
            for listStation in group['handlingStations']:
                station = self.getStationById(listStation['id'])
                if station is not None:
                    station = Periphery.HandlingStation(stationId=listStation['id'])
                    if listStation['handlingAccessNodes']:
                        node = self.getNodeById(listStation['handlingAccessNodes'][0]['nodeId'])
                        if node is not None:
                            x = node['x'] + 1
                            y = node['y'] + 1
                            station.assignNode(node)
                        else:
                            x = y = 0
                            print('Station has no node: ', listStation['id'])
                        station.updatePosition(x, y)
                    self._stations.append(station)
                self._groups[-1].addStation(station)


class NavigationGraph:
    def __init__(self, graphId=None):
        self._graphId = graphId
        self._coordinateTransformation = CoordinateTransformation()
        self.agvTypes = list()
        self._nodes = list()
        self._transformedNodeCoordinates = list()
        self._edges = list()
        self._trajectories = dict()
        self._edgesCoordinates = dict()
        self._idManager = IdManagement.Manager()
        self._changedNodesLog = list()

    def __eq__(self, other):
        if other is not None and self._graphId == other._graphId:
            return True
        else:
            return False

    def __ne__(self, other):
        if other is None or self._graphId != other._graphId:
            return True
        else:
            return False

    def getId(self): #ToDo: Convert to property
        return self._graphId

    def setId(self, newId): #ToDo: Convert to property  -> must be unique
        self._graphId = newId

    @property
    def coordinateTransformation(self):
        return self._coordinateTransformation

    @coordinateTransformation.setter
    def coordinateTransformation(self, newTransformation):
        if self._coordinateTransformation != newTransformation:
            self._coordinateTransformation = newTransformation
            self.recalculateTransformation()

    def recalculateTransformation(self):
        self._transformedNodeCoordinates = list() #ToDo: Maybe combine with existing node list?
        for node in self._nodes:
            mapX, mapY = self.coordinateTransformation.transformCoordinates(x=node['x'], y=node['y'])
            node['mapX'] = mapX
            node['mapY'] = mapY

    def toJson(self, parkingSpotAsBoolean=False):
        jsonStruct = {
            'id': self._graphId,
            'graphToMapTransformation': self.coordinateTransformation.toJson(),
            'agvTypes': [agvType.toJson() for agvType in self.agvTypes],
            'nodes': [self.nodeToJson(node, parkingSpotAsBoolean= parkingSpotAsBoolean) for node in self._nodes],
            'edges': self._edges
        }
        return jsonStruct

    @staticmethod
    def nodeToJson(node, parkingSpotAsBoolean=False):
        jsonStruct = {
            'id': node['id'],
            'graphX': node['x'],
            'graphY': node['y'],
            'graphZ': node['z'],
        }
        if parkingSpotAsBoolean:
            if 'parkingSpot' in node:
                jsonStruct['parkingSpot'] = True
            else:
                jsonStruct['parkingSpot'] = False
        else:
            if 'parkingSpot' in node:
                jsonStruct['parkingSpot'] = node['parkingSpot']
        if 'dependentNodeIds' in node:
            jsonStruct['dependentNodeIds'] = [dependency.toJson() for dependency in node['dependentNodeIds']]
        if 'emergencySpot' in node:
            jsonStruct['emergencySpot'] = node['emergencySpot']
        return jsonStruct

    def nodeInChangedNodeLogs(self, node, move=False):
        for nodeInfo in self._changedNodesLog:
            if node['id'] == nodeInfo['id'] and move == nodeInfo['moved']:
                return True
        return False

    def compare(self, compareGraph):
        changes = list()
        nodesToRemove = list()
        nodesToAdd = list()
        edgesToRemove = list()
        edgesToAdd = list()
        print('Comparing...')
        print('...Comparing Nodes...')
        for node in self._nodes:
            nodeFound = False
            for compareNode in compareGraph._nodes:
                if node['id'] == compareNode['id']:
                    nodeFound = True
                    if node['x'] != compareNode['x'] or node['y'] != compareNode['y']:
                        deviation = math.sqrt((node['x']-compareNode['x'])**2+(node['y']-compareNode['y'])**2)
                        self.updateNodeCoordinates(node, compareNode['x']-node['x'], compareNode['y']-node['y'], inLocalCoordinates=True)
                        if deviation > 0.5:
                            changes.append("WARNING: Node " + node['id'] + " - coordinates changed noticeably by " + str(deviation) + " m!")
                        else:
                            changes.append("Node "+node['id']+" - coordinates changed.")
                        break
            if not nodeFound:
                changes.append("Node "+node['id']+" - does not exist anymore and was removed.")
                nodesToRemove.append(node)
        for compareNode in compareGraph._nodes:
            nodeAlreadyExist = False
            for node in self._nodes:
                if node['id'] == compareNode['id']:
                    nodeAlreadyExist = True
                    break
            if not nodeAlreadyExist:
                changes.append("Node "+compareNode['id']+" - is missing and was added.")
                nodesToAdd.append(compareNode)
        for node in nodesToRemove:
            self.deleteNode(node)
        for node in nodesToAdd:
            self.createNode(node['x'], node['y'], nodeId=node['id'], inLocalCoordinates=True)
        #compare edges
        print('...Comparing Edges...')
        for edge in self._edges:
            edgeFound = False
            for compareEdge in compareGraph._edges:
                if edge['id'] == compareEdge['id']:
                    edgeFound = True
                    if edge['startNodeId'] != compareEdge['startNodeId'] or edge['endNodeId'] != compareEdge['endNodeId']:
                        edge['startNodeId'] = compareEdge['startNodeId']
                        edge['endNodeId'] = compareEdge['endNodeId']
                        changes.append("Edge "+edge['id']+" - start and end node updated.")
                        break
            if not edgeFound:
                changes.append("Edge "+edge['id']+" - does not exist anymore and was removed.")
                edgesToRemove.append(edge)
        for compareEdge in compareGraph._edges:
            edgeAlreadyExist = False
            for edge in self._edges:
                if edge['id'] == compareEdge['id']:
                    edgeAlreadyExist = True
                    break
            if not edgeAlreadyExist:
                changes.append("Edge "+compareEdge['id']+" - is missing and was added.")
                edgesToAdd.append(compareEdge)
        for edge in edgesToRemove:
            self.deleteEdge(edge)
        for edge in edgesToAdd:
            startNode = self.getNodeById(edge['startNodeId'])
            endNode = self.getNodeById(edge['endNodeId'])
            if startNode is None:
                print('Could not add ', edge['id'], 'because node', edge['startNodeId'], 'is unknown.')
            if endNode is None:
                print('Could not add ', edge['id'], 'because node', edge['endNodeId'], 'is unknown.')
            if startNode is not None and endNode is not None:
                self.createEdge(startNode, endNode, edgeId=edge['id'])
        print("Changes:")
        for change in changes:
            print(change)
        self.recalculateTransformation()
        return changes

    def jsonStructToTrajectories(self, jsonStruct):
        for edge in jsonStruct['edges']:
            points = list()
            weights = list()
            for point in edge['trajectory']['controlPoints']:
                points.append([point['graphX'], point['graphY']])
                weights.append(point['w'])
            newTrajectory = MapGeneratorNURBS.Trajectory(controlPoints=points, weights=weights, kVector=edge['trajectory']['knotVector'], degree=edge['trajectory']['degree'])
            self._trajectories[edge['id']] = newTrajectory

    def addAGVType(self, agvType):
        self.agvTypes.append(agvType)

    def removeAGVType(self, agvType):
        self.agvTypes.remove(agvType)

    def getAgvTypes(self):
        return self.agvTypes

    def agvTypeExist(self, newAgvType):
        for agvType in self.agvTypes:
            if newAgvType == agvType:
                return True
        return False

    @staticmethod
    def deleteNodeType(node, nodeType):
        del node[str(nodeType)]

    @staticmethod
    def isNodeType(node, nodeType):
        if nodeType in node:
            return True
        else:
            return False

    def getNodes(self):
        return self._nodes

    def getEdges(self):
        return self._edges

    def isNode(self, potentialNode):
        if potentialNode is None or isinstance(potentialNode, (Periphery.TrafficLight, Periphery.HandlingStation, Periphery.ChargingStation)):
            return False
        elif 'x' in potentialNode and self.nodeIdInNodes(potentialNode['id']):
            return True
        else:
            return False

    def isEdge(self, potentialEdge):
        if potentialEdge is None or isinstance(potentialEdge, (Periphery.TrafficLight, Periphery.HandlingStation, Periphery.ChargingStation)):
            return False
        elif 'startNodeId' in potentialEdge and self.edgeIdInEdges(potentialEdge['id']):
            return True
        else:
            return False

    def nodeIdInNodes(self, Id):
        for node in self._nodes:
            if node['id'] == Id:
                return True
        return False

    def createNode(self, nodeX, nodeY, nodeId=None, inLocalCoordinates=False):
        if inLocalCoordinates:
            x = nodeX
            y = nodeY
            mapX, mapY = self.coordinateTransformation.transformCoordinates(x=nodeX, y=nodeY)
        else:
            mapX = nodeX
            mapY = nodeY
            x, y = self.coordinateTransformation.reverseTransformCoordinates(x=nodeX, y=nodeY)
        if nodeId is None:
            self._nodes.append({'id': self._idManager.getNewId(), 'x': x, 'y': y, 'z': 0.0, 'mapX': mapX, 'mapY': mapY})
        else:
            self._nodes.append({'id': str(nodeId), 'x': x, 'y': y, 'z': 0.0, 'mapX': mapX, 'mapY': mapY})
        return self._nodes[-1]

    def deleteNode(self, node):
        self._edges = [edge for edge in self._edges if
                       edge['startNodeId'] != (node['id']) and edge['endNodeId'] != (node['id'])]
        self._idManager.freeId(node['id'])
        self._nodes.remove(node)

    def _cleanUpDependencies(self, nodeToRemove):
        for node in self._nodes:
            if 'dependentNodeIds' in node and nodeToRemove['id'] in node['dependentNodeIds']:
                self.removeDependencyFromNode(node, nodeToRemove)

    def updateNodeId(self, node, nodeId):
        if self.nodeIdInNodes(nodeId):
            return False
        else:
            self.updateNodeIdInEdges(node['id'], nodeId)
            node['id'] = nodeId
            self._idManager.useId(nodeId)
            return True

    def updateNodeCoordinates(self, node, dx, dy, inLocalCoordinates=False): #ToDo local coordinates same as in createNode
        if inLocalCoordinates:
            node['x'] += dx
            node['y'] += dy
            mapX, mapY = self.coordinateTransformation.transformCoordinates(x=node['x'], y=node['y'])
            node['mapX'] = mapX
            node['mapY'] = mapY
        else:
            node['mapX'] += dx
            node['mapY'] += dy
            localX, localY = self.coordinateTransformation.reverseTransformCoordinates(x=node['mapX'], y=node['mapY'])
            node['x'] = localX
            node['y'] = localY

    def getConnectedNodes(self, node):
        nodes = []
        for edge in self._edges:
            startNode, endNode = self.getEdgeNodes(edge)
            if edge['startNodeId'] == node['id']:
                nodes.append(endNode)
            if edge['endNodeId'] == node['id']:
                nodes.append(startNode)
        return nodes
    
    @staticmethod
    def addNodeType(node, nodeType, nodeTypeInfo=None, oldFormat=False):
        if nodeType == 'emergencySpot':
            NavigationGraph.addNodeTypeEmergencySpot(node, nodeTypeInfo, oldFormat)
        elif nodeType == 'parkingSpot':
            NavigationGraph.addNodeTypeParkingSpot(node, nodeTypeInfo, oldFormat)
        else:
            print('Unknown node type:', nodeType)

    @staticmethod
    def addNodeTypeEmergencySpot(node, nodeTypeInfo=None, oldFormat=False):
        if oldFormat:
            node['emergencyBay'] = {}
        else:
            if isinstance(nodeTypeInfo, type(None)):
                node['emergencySpot'] = True
            else:
                node['emergencySpot'] = nodeTypeInfo
    
    @staticmethod
    def addNodeTypeParkingSpot(node, nodeTypeInfo=None, oldFormat=False):
        if oldFormat:
            typeId = 'Parking'+str(node['id'])
            node['parkingSpot'] = {'name': typeId, 'description': typeId}
        else:
            if isinstance(nodeTypeInfo, type(None)):
                node['parkingSpot'] = True
            else:
                node['parkingSpot'] = nodeTypeInfo

    @staticmethod
    def addGate(node, gateId):
        node['gate'] = {'id': gateId}

    @staticmethod
    def testGateInEntryLocation(node, gateId):
        if 'gates' in node['entryLocation']:
            if gateId in node['entryLocation']['gates']:
                return True
        return False

    @staticmethod
    def addGateToEntryLocation(node, gateId):
        if 'gates' in node['entryLocation']:
            node['entryLocation']['gates'].append(gateId)
        else:
            node['entryLocation']['gates'] = [gateId]

    @staticmethod
    def removeGateFromEntryLocation(node, gateId):
        node['entryLocation']['gates'].remove(gateId)
        if not node['entryLocation']['gates']:
            node['entryLocation'].pop('gates')

    def removeAllGateEntryLocationRelations(self):
        for node in self._nodes:
            if self.isNodeType(node, 'entryLocation') and 'gates' in node['entryLocation']:
                node['entryLocation'].pop('gates')

    def tidyUpEntryLocations(self):
        gates = []
        for node in self._nodes:
            if 'gate' in node:
                gates.append(node['gate']['id'])
        for node in self._nodes:
            if 'entryLocation' in node and 'gates' in node['entryLocation']:
                for gate in node['entryLocation']['gates']:
                    if gate not in gates:
                        node['entryLocation']['gates'].remove(gate)

    def addDependencyToNode(self, node, dependantNode, navGraph=None):
        if navGraph is None:
            dependency = Dependency(nodeId=dependantNode['id'], navGraph=self)
        else:
            dependency = Dependency(nodeId=dependantNode['id'], navGraph=navGraph)
        if 'dependentNodeIds' in node:
            if dependency not in node['dependentNodeIds']:
                node['dependentNodeIds'].append(dependency)
        else:
            node['dependentNodeIds'] = [dependency]
        return

    def removeDependencyFromNode(self, node, dependantNode, navGraph=None):
        if navGraph is None:
            dependencyToRemove = Dependency(nodeId=dependantNode['id'], navGraph=self)
        else:
            dependencyToRemove = Dependency(nodeId=dependantNode['id'], navGraph=navGraph)
        if 'dependentNodeIds' in node:
            node['dependentNodeIds'] = [dependency for dependency in node['dependentNodeIds'] if dependency != dependencyToRemove]
        else:
            print('Node has no dependencies!')
            return
        if not node['dependentNodeIds']:
            node.pop('dependentNodeIds')

    @staticmethod
    def hasDependency(node, dependency):
        if 'dependentNodeIds' in node and dependency in node['dependentNodeIds']:
            return True
        else:
            return False

    @staticmethod
    def nodeDependencies(node):
        if 'dependentNodeIds' in node:
            return node['dependentNodeIds']
        else:
            return None

    def getPointingDependentNodes(self, selectedNode):
        pointingDependencies = list()
        selectedNodeDependency = Dependency(nodeId=selectedNode['id'], navGraph=self)
        for node in self._nodes:
            if 'dependentNodeIds' in node:
                for dependency in self.nodeDependencies(node):
                    if selectedNodeDependency == dependency:
                        pointingDependencies.append(node)
        return pointingDependencies

    def edgeIdInEdges(self, Id):
        for edge in self._edges:
            if edge['id'] == Id:
                return True
        return False

    def updateEdgeIdByNode(self, edge):
        startNode = self.getNodeById(edge['startNodeId'])
        endNode = self.getNodeById(edge['endNodeId'])
        self.updateEdgeId(edge, str(startNode['id']) + '_' + str(endNode['id']))

    def createEdge(self, startNode, endNode, edgeId=None):
        if edgeId is None:
            self._edges.append({'id': str(startNode['id']) + '_' + str(endNode['id']), 'startNodeId': startNode['id'], 'endNodeId': endNode['id']})
        else:
            self._edges.append({'id': str(edgeId), 'startNodeId': startNode['id'], 'endNodeId': endNode['id']})
        self.holdEdgeCoordinates(self._edges[-1])
        return self._edges[-1]

    def holdEdgeCoordinates(self, edge):
        startNode, endNode = self.getEdgeNodes(edge)
        self._edgesCoordinates[str(edge['id'])] = {'startNode': startNode,
                                                   'endNode': endNode}

    def updateEdgeCoordinates(self):
        for edge in self._edges:
            self.holdEdgeCoordinates(edge)

    def updateEdgeId(self, edge, edgeId=None):
        if edgeId is not None:
            if self.edgeIdInEdges(edgeId):
                return False
            else:
                self._edgesCoordinates[str(edgeId)] = self._edgesCoordinates.pop(str(edge['id']))
                edge['id'] = edgeId
                return True

    def deleteEdgeCoordinates(self, edge):
        del self._edgesCoordinates[str(edge['id'])]

    def getEdgeById(self, Id):
        for edge in self._edges:
            if edge['id'] == Id:
                return edge

    def deleteEdge(self, edge):
        #self.deleteTrajectory(edge['id'])
        self.deleteEdgeCoordinates(edge)
        self._edges.remove(edge)

    def updateNodeIdInEdges(self, oldId, newId):
        for edge in self._edges:
            if edge['startNodeId'] == oldId:
                edge['startNodeId'] = newId
            if edge['endNodeId'] == oldId:
                edge['endNodeId'] = newId

    def getEdgeLength(self, edge):
        startNode, endNode = self.getEdgeNodes(edge)
        edgeLength = math.sqrt((endNode['x']-startNode['x'])**2 + (endNode['y']-startNode['y'])**2)
        return edgeLength

    def splitEdge(self, edgeId, limit):
        edge = self.getEdgeById(edgeId)
        if edge is None:
            return
        startNode, endNode = self.getEdgeNodes(edge)
        if HelperFunctions.distance(startNode, endNode) > limit:
            reverseEdge = self.reverseEdge(edge)
            numberNewNodes = math.ceil(HelperFunctions.distance(startNode, endNode) / limit) - 1
            dx = (endNode['x'] - startNode['x']) / (numberNewNodes + 1)
            dy = (endNode['y'] - startNode['y']) / (numberNewNodes + 1)
            nodes = [startNode]
            for n in range(numberNewNodes):
                nodes.append(self.createNode(nodeX=startNode['x'] + (n+1) * dx, nodeY=startNode['y'] + (n+1) * dy, inLocalCoordinates=True))
            nodes.append(endNode)
            if reverseEdge is not None:
                for e in range(numberNewNodes+1):
                    self.createEdge(nodes[e], nodes[e+1])
                    self.createEdge(nodes[e+1], nodes[e])
                self.deleteEdge(edge)
                self.deleteEdge(reverseEdge)
            else:
                for e in range(numberNewNodes+1):
                    self.createEdge(nodes[e], nodes[e+1])
                self.deleteEdge(edge)

    def splitEdges(self, limit):
        for edge in copy.copy(self._edges):
            self.splitEdge(edge['id'], limit)

    def reverseEdge(self, originalEdge):
        for edge in self._edges:
            if edge['startNodeId'] == originalEdge['endNodeId'] and edge['endNodeId'] == originalEdge['startNodeId']:
                return edge
        return None

    def getEdgeNodes(self, edge):
        startNode = next(item for item in self._nodes if item['id'] == edge['startNodeId'])
        endNode = next(item for item in self._nodes if item['id'] == edge['endNodeId'])
        return startNode, endNode

    def testEdgeExists(self, startNode, endNode):
        for edge in self._edges:
            if edge['startNodeId'] == startNode['id'] and edge['endNodeId'] == endNode['id']:
                return True
        return False

    def testEdgeIntersect(self, startNode, endNode):
        for edge in self._edges:
            edge_startNode, edge_endNode = self.getEdgeNodes(edge)
            if HelperFunctions.intersect((startNode['x'], startNode['y']), (endNode['x'], endNode['y']),
                              (edge_startNode['x'], edge_startNode['y']), (edge_endNode['x'], edge_endNode['y'])):
                if startNode['id'] != edge_startNode['id'] and startNode['id'] != edge_endNode['id'] and \
                        endNode['id'] != edge_startNode['id'] and endNode['id'] != edge_endNode['id']:
                    return True
        return False

    def getNodeByGate(self, gate):
        for node in self._nodes:
            if self.isNodeType(node, 'gate') and node['gate']['id'] == gate:
                return node
        return None

    def getNodeById(self, nodeId):
        for node in self._nodes:
            if node['id'] == nodeId:
                return node
        return None

    def getNodeByCoordinates(self, x, y, tolerance=0.0):
        for node in self._nodes:
            if x-tolerance < node['x'] < x+tolerance and y-tolerance < node['y'] < y+tolerance:
                return node
        return None

    def assignNewIds(self):
        for node in self._nodes:
            self.updateNodeId(node, self._idManager.getNewId())
        for edge in self._edges:
            self.updateEdgeIdByNode(edge)

class AGVType:
    def __init__(self, vendor=str(), name=str()):
        self._vendor = str(vendor)
        self._name = str(name)

    def __eq__(self, other):
        if isinstance(other, AGVType):
            if self._vendor == other._vendor and self._name == other._name:
                return True
        return False

    def __ne__(self, other):
        if isinstance(other, AGVType):
            if self._vendor != other._vendor or self._name != other._name:
                return True
        return False

    def changeName(self, newName):
        if newName:
            self._name = str(newName)

    def changeVendor(self, newVendor):
        if newVendor:
            self._vendor = str(newVendor)

    def getVendor(self):
        return self._vendor

    def getName(self):
        return self._name

    def toJson(self):
        jsonStruct = {
            "vendorName": self._vendor,
            "typeName": self._name
        }
        return jsonStruct


class CoordinateTransformation:
    def __init__(self, transX=0.0, transY=0.0, rotation=0.0):
        self._translationX = transX
        self._translationY = transY
        self._translationZ = 0.0
        self._rotationZ = rotation

    @property
    def translationX(self):
        return self._translationX

    @translationX.setter
    def translationX(self, newTranslation):
        self._translationX = newTranslation
        print('Manual setting of new translation x in transformation!')

    @property
    def translationY(self):
        return self._translationY

    @translationY.setter
    def translationY(self, newTranslation):
        self._translationY = newTranslation
        print('Manual setting of new translation y in transformation!')

    @property
    def translationZ(self):
        return self._translationZ

    @translationZ.setter
    def translationZ(self, newTranslation):
        self._translationZ = newTranslation
        print('Manual setting of new rotation z in transformation!')

    @property
    def rotationZ(self):
        return self._rotationZ

    @rotationZ.setter
    def rotationZ(self, newRotation):
        if -3.1416 < newRotation < 3.1416:
            self._rotationZ = newRotation

    def __eq__(self, other):
        if isinstance(other, CoordinateTransformation):
            if self.translationX != other.translationX or self.translationY != other.translationY or self.rotationZ != other.rotationZ:
                return False
            else:
                return True
        else:
            return False

    def __ne__(self, other):
        if not self.__eq__(other):
            return True
        else:
            return False

    def transformationIsNull(self):
        if self.translationX == 0.0 and self.translationY == 0.0 and self.rotationZ == 0.0:
            return True
        else:
            return False

    def transformCoordinates(self, x, y):
        xt = math.cos(self.rotationZ) * (x - self.translationX) - math.sin(self.rotationZ) * (y - self.translationY)
        yt = math.sin(self.rotationZ) * (x - self.translationX) + math.cos(self.rotationZ) * (y - self.translationY)
        return xt, yt

    def reverseTransformCoordinates(self, x, y):
        xrt = math.cos(self.rotationZ) * x + math.sin(self.rotationZ) * y + self.translationX
        yrt = - math.sin(self.rotationZ) * x + math.cos(self.rotationZ) * y + self.translationY
        return xrt, yrt

    def rosTransformCoordinates(self, x, y, w=0.0):
        xt = math.cos(self.rotationZ) * x + math.sin(self.rotationZ) * y + self.translationX
        yt = - math.sin(self.rotationZ) * x + math.cos(self.rotationZ) * y + self.translationY
        #xt = math.cos(-self.rotationZ) * (x + self.translationX) - math.sin(-self.rotationZ) * (y + self.translationY)
        #yt = math.sin(-self.rotationZ) * (x + self.translationX) + math.cos(-self.rotationZ) * (y + self.translationY)
        #xt = (w**2 - self.rotationZ**2) * x - 2*w*self.rotationZ* y + self.translationX
        #yt = 2*w*self.rotationZ*x + (w**2 - self.rotationZ**2) * y + self.translationY
        return xt, yt

    def toJson(self):
        jsonStruct = {
            'xTranslation': self.translationX,
            'yTranslation': self.translationY,
            'zTranslation': 0.0,
            'zRotation': self.rotationZ
        }
        return jsonStruct


class Dependency:
    def __init__(self, nodeId, navGraph):
        self._nodeId = nodeId
        self._navigationGraph = navGraph

    @property
    def nodeId(self):
        return self._nodeId

    @nodeId.setter
    def nodeId(self, newNodeId):
        if isinstance(newNodeId, str):
            self._nodeId = newNodeId

    @property
    def navigationGraph(self):
        return self._navigationGraph

    @navigationGraph.setter
    def navigationGraph(self, newGraphId):
        if isinstance(newGraphId, str):
            self._navigationGraph = newGraphId

    def toJson(self):
        return {'id': self.nodeId, 'navigationGraphId': self._navigationGraph.getId()}

    def __eq__(self, other):
        if self.nodeId == other.nodeId and self.navigationGraph == other.navigationGraph:
            return True
        else:
            return False

    def __ne__(self, other):
        if self.nodeId == other.nodeId and self.navigationGraph == other.navigationGraph:
            return False
        else:
            return True