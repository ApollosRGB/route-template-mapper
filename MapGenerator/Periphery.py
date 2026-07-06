
import MapComponents
import ControlComponents
import enum
from HelperFunctions import deleteEmptyDictionaryKeys

class StationAutomaticSelectionMode(enum.Enum):
    ALWAYS = enum.auto()
    ONLY_PICK = enum.auto()
    ONLY_DROP = enum.auto()
    NEVER = enum.auto()

class HandlingStationGroup:
    
    def __init__(self, groupId=str(), controlled=True):
        self._groupId = groupId
        self._stations = list()
        self._waitingSpots = list()
        self._controlled = controlled
        self._stationAutomaticSelectionMode = StationAutomaticSelectionMode.ALWAYS
        self._justInSequence = False

    @property
    def controlled(self):
        return self._controlled
    
    @property
    def stationAutomaticSelectionMode(self):
       return self._stationAutomaticSelectionMode

    @property
    def justInSequence(self):
        return self._justInSequence
    
    @controlled.setter
    def controlled(self, newSetting):
        if isinstance(newSetting, bool):
            self._controlled = newSetting
    
    @stationAutomaticSelectionMode.setter
    def stationAutomaticSelectionMode(self, newSetting):
        if isinstance(newSetting, StationAutomaticSelectionMode):
            self._stationAutomaticSelectionMode = newSetting
        if isinstance(newSetting, str):
            self._stationAutomaticSelectionMode = StationAutomaticSelectionMode[newSetting]

    @justInSequence.setter
    def justInSequence(self, newSetting):
        if isinstance(newSetting, bool):
            self._justInSequence = newSetting

    def addWaitingSpot(self, waitingSpot):
        self._waitingSpots.append(waitingSpot)
        return self._waitingSpots

    def getWaitingSpots(self):
        return self._waitingSpots

    def toJson(self):
        group = {
            'id': self._groupId,
            'controlled': self._controlled,
            'stationAutomaticSelectionMode': self._stationAutomaticSelectionMode.name,
            'justInSequence': self._justInSequence,
            'handlingStations': [station.toJson() for station in self._stations],
            'waitingSpots': [waitingSpot.toJson(onlyId=True) for waitingSpot in self._waitingSpots]
        }
        group = deleteEmptyDictionaryKeys(group)
        return group

    def toJsonOldModel(self):
        group = {
            'id': self._groupId,
            'handlingStations': [station.toJsonOldModel() for station in self._stations]
        }
        return group

    def getId(self):
        return self._groupId

    def setId(self, groupId):  # ToDo: Check for already existing IDs
        self._groupId = groupId

    def addStation(self, station):
        if station not in self._stations:
            self._stations.append(station)

    def removeStation(self, station):
        if station in self._stations:
            self._stations.remove(station)

    def getStations(self):
        return self._stations


class HandlingStation:

    def __init__(self, x=0, y=0, stationId=str()):
        self._stationId = stationId
        self._accessNodes = list()
        self._actions = list()
        self._waitingSpots = list()
        self._x = x
        self._y = y

    def toJson(self):
        station = {
            'id': self._stationId,
            'mapX': self._x,
            'mapY': self._y,
            'mapZ': 0.0,
            'length': 5.0,
            'width': 5.0,
            'height': 5.0,
            'accessNodes': [{'navigationGraphId': node.getGraphId(), 'nodeId': node.getNodeId()}
                            for node in self._accessNodes]
        }
        if self._actions:
            station['actions'] = [action for action in self._actions]
        return station

    def toJsonOldModel(self):
        station = {
            'id': self._stationId,
            'handlingAccessNodes': [{'nodeId': node.getNodeId()} for node in self._accessNodes],
            'x': self._x,
            'y': self._y,
            'z': 0.0,
            'length': 5.0,
            'width': 5.0,
            'height': 5.0
        }
        return station

    def fromJson(self, station):
        self._stationId = station['id']

    def getPosition(self):
        return self._x, self._y

    def updatePosition(self, x, y):
        self._x = x
        self._y = y

    def getId(self):
        return self._stationId

    def setId(self, stationId):
        self._stationId = stationId
        return True

    def addAction(self, typeName, triggerEvent):
        if isinstance(typeName, str) and isinstance(triggerEvent, str):
            self._actions.append({
                'type': typeName,
                'triggerEvent': triggerEvent
            })

    def removeAction(self, typeName, triggerEvent):
        try:
            self._actions.remove({'type': typeName, 'triggerEvent': triggerEvent})
        except ValueError:
            print('Station does not have corresponding action:', {'type': typeName, 'triggerEvent': triggerEvent})

    def hasAccessNode(self, graphId, nodeId):
        for accessNode in self._accessNodes:
            if graphId == accessNode.getGraphId() and nodeId == accessNode.getNodeId():
                return True
        return False

    def assignNode(self, graph, node):
        accessNode = AccessNode()
        accessNode.setAccessNode(graph, node)
        self._accessNodes.append(accessNode)

    def deleteNodeAssignment(self, graphId, nodeToDelete):
        for accessNode in self._accessNodes:
            if nodeToDelete == accessNode.getNodeId() and graphId == accessNode.getGraphId():
                self._accessNodes.remove(accessNode)
                break

    def deleteAllNodeAssignmentsOfGraph(self, graphId):
        for accessNode in self._accessNodes:
            if graphId == accessNode.getGraphId():
                self._accessNodes.remove(accessNode)

    def getAssignedNodesOfGraph(self, graph):
        assignedNodes = list()
        for accessNode in self._accessNodes:
            if accessNode.getGraphId() == graph.getId():
                assignedNodes.append(accessNode.getNodeId())
        return assignedNodes

    def getAllAssignedNodes(self):
        assignedNodes = list()
        for accessNode in self._accessNodes:
            node = {'graphId': accessNode.getGraphId(), 'nodeId': accessNode.getNodeId()}
            assignedNodes.append(node)
        return assignedNodes
    
    def checkStationInGroup(self, groups):
        for stationGroup in groups:
            if self in stationGroup.getStations():
                return True
            
        return False

class ChargingStation:

    def __init__(self, x=0, y=0, stationId=str(), controlled=True):
        self._stationId = stationId
        self._accessNodes = list()
        self._x = x
        self._y = y
        self._controlled = controlled

    @property
    def controlled(self):
        return self._controlled

    @controlled.setter
    def controlled(self, newSetting):
        if isinstance(newSetting, bool):
            self._controlled = newSetting

    def toJson(self):
        station = {
            'id': self._stationId,
            'mapX': self._x,
            'mapY': self._y,
            'mapZ': 0.0,
            'length': 5.0,
            'width': 5.0,
            'height': 5.0,
            'controlled': self._controlled,
            'accessNodes': [{'navigationGraphId': node.getGraphId(), 'nodeId': node.getNodeId()}
                            for node in self._accessNodes]
        }
        return station

    def toJsonOldModel(self):
        station = {
            'id': self._stationId,
            'handlingAccessNodes': [{'nodeId': node.getNodeId()} for node in self._accessNodes]
        }
        return station

    def fromJson(self, station):
        self._stationId = station['id']

    def getPosition(self):
        return self._x, self._y

    def updatePosition(self, x, y):
        self._x = x
        self._y = y

    def getId(self):
        return self._stationId

    def setId(self, stationId):
        self._stationId = stationId
        return True

    def hasAccessNode(self, graphId, nodeId):
        for accessNode in self._accessNodes:
            if graphId == accessNode.getGraphId() and nodeId == accessNode.getNodeId():
                return True
        return False

    def assignNode(self, graph, node):
        accessNode = AccessNode()
        accessNode.setAccessNode(graph, node)
        self._accessNodes.append(accessNode)

    def deleteNodeAssignment(self, graphId, nodeToDelete):
        for accessNode in self._accessNodes:
            if nodeToDelete == accessNode.getNodeId() and graphId == accessNode.getGraphId():
                self._accessNodes.remove(accessNode)
                break

    def deleteAllNodeAssignmentsOfGraph(self, graphId):
        for accessNode in self._accessNodes:
            if graphId == accessNode.getGraphId():
                self._accessNodes.remove(accessNode)

    def getAssignedNodesOfGraph(self, graph):
        assignedNodes = list()
        for accessNode in self._accessNodes:
            if accessNode.getGraphId() == graph.getId():
                assignedNodes.append(accessNode.getNodeId())
        return assignedNodes

    def getAllAssignedNodes(self):
        assignedNodes = list()
        for accessNode in self._accessNodes:
            node = {'graphId': accessNode.getGraphId(), 'nodeId': accessNode.getNodeId()}
            assignedNodes.append(node)
        return assignedNodes
    
class AccessNode:

    def __init__(self):
        self._graph = None
        self._nodeId = str()

    def getNodeId(self):
        return self._nodeId

    def getGraphId(self):
        if self._graph is not None:
            return self._graph.getId()
        else:
            return None

    def setAccessNode(self, graph, node):
        if isinstance(graph, MapComponents.NavigationGraph):
            self._graph = graph
            self._nodeId = node['id']

    def changeId(self, newId):
        self._nodeId = newId


class TrafficLight:
    def __init__(self, x=0, y=0, trafficLightId=str()):
        self._trafficLightId = trafficLightId
        self._x = x
        self._y = y
        self.triggerScenario = None

    def toJson(self):
        light = {
            'id': self._trafficLightId,
            'mapX': self._x,
            'mapY': self._y,
            'mapZ': 0.0,
        }
        if self.triggerScenario is not None:
            light['scenarioIndicatorCounter'] = self.triggerScenario.toJson()
        return light

    def fromJson(self, station):
        pass

    def getPosition(self):
        return self._x, self._y

    def updatePosition(self, x, y):
        self._x = x
        self._y = y

    def getId(self):
        return self._trafficLightId

    def setId(self, lightId):
        self._trafficLightId = lightId
        return True

    def createTriggerScenario(self, onScenario='on', offScenario='off', threshold=1):
        self.triggerScenario = ControlComponents.TriggerScenario(onScenario, offScenario, threshold)

class WaitingSpot:
    def __init__(self, id=str(), nodes=list()):
        self._id = id
        self._nodes = nodes
    
    @property
    def id(self):
        return self._id
    
    @id.setter
    def id(self, newId):
        self._id = newId
    
    @property
    def nodes(self):
        return self._nodes
    
    @nodes.setter
    def nodes(self, newNodes):
        self._nodes = newNodes

    def toJson(self, onlyId=False):
        jsonStruct = {
            "id": self._id
        }
        if not onlyId:  # here, you can add all attributes which expends the jsonStruct with "onlyId"
            jsonStruct["nodes"] = self._nodes
        return jsonStruct