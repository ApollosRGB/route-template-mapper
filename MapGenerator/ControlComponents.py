class LimitedCapacityArea:

    def __init__(self, identifier, capacity):
        self.identifier = identifier
        self.capacity = capacity
        self._nodes = list()

    @property
    def identifier(self):
        return self._identifier

    @identifier.setter
    def identifier(self, newIdentifier):
        if newIdentifier:
            self._identifier = str(newIdentifier)
        else:
            raise ValueError('Cannot set empty value as new identifier.')

    @property
    def capacity(self):
        return self._capacity

    @capacity.setter
    def capacity(self, newCapacity):
        if newCapacity > 0:
            self._capacity = newCapacity
        else:
            raise ValueError('Capacity of limited capacity area must be greater zero.')

    def addNode(self, newNodeId, newNodeNavGraph): #ToDo: create proper node object
        node = {'nodeId': newNodeId, 'navigationGraphId': newNodeNavGraph}
        if node not in self._nodes:
            self._nodes.append(node)

    def removeNode(self, nodeToRemoveId, nodeToRemoveNavGraph): #ToDo: create proper node object
        node = {'nodeId': nodeToRemoveId, 'navigationGraphId': nodeToRemoveNavGraph}
        try:
            self._nodes.remove(node)
        except ValueError:
            return

    def toJson(self):
        return {
            'id': self.identifier,
            'capacity': self.capacity,
            'nodes': self._nodes
        }


class TriggerScenario:
    def __init__(self, onScenario='on', offScenario='off', threshold=1):
        self.onScenario = onScenario
        self.offScenario = offScenario
        self.threshold = threshold
        self._nodes = list()

    @property
    def onScenario(self):
        return self._onScenario

    @onScenario.setter
    def onScenario(self, newOnScenario):
        if isinstance(newOnScenario, str):
            if newOnScenario in ['on', 'off']:
                self._onScenario = newOnScenario
            else:
                raise ValueError('Value must be \'on\' or \'off\'.')
        else:
            raise TypeError('OnScenario value must be of type string.')

    @property
    def offScenario(self):
        return self._offScenario

    @offScenario.setter
    def offScenario(self, newOffScenario):
        if isinstance(newOffScenario, str):
            if newOffScenario in ['on', 'off']:
                self._offScenario = newOffScenario
            else:
                raise ValueError('Value must be \'on\' or \'off\'.')
        else:
            raise TypeError('OffScenario value must be of type string.')

    @property
    def threshold(self):
        return self._threshold

    @threshold.setter
    def threshold(self, newThreshold):
        if isinstance(newThreshold, int):
            if newThreshold > 0:
                self._threshold = newThreshold
            else:
                raise ValueError('Threshold must be bigger then zero.')
        else:
            raise TypeError('Threshold must be of type integer.')

    def toJson(self):
        return {
            'onScenario': self.onScenario,
            'offScenario': self.offScenario,
            'onThreshold': self.threshold,
            'triggerNodes': [triggerNode.toJson() for triggerNode in self._nodes]
        }

    def addTriggerNode(self, nodeId, navigationGraphId, value=1, event=None):
        newTriggerNode = TriggerNode(nodeId=nodeId, navigationGraphId=navigationGraphId, value=value, event=event)
        if not self.hasTriggerNode(newTriggerNode):
            self._nodes.append(newTriggerNode)

    def hasTriggerNode(self, searchedTriggerNode) -> bool:
        for triggerNode in self._nodes:
            if searchedTriggerNode == triggerNode:
                return True
        return False

    def removeTriggerNode(self, nodeId, navigationGraphId):
        try:
            self._nodes.remove(TriggerNode(nodeId=nodeId, navigationGraphId=navigationGraphId))
        except ValueError:
            return


class TriggerNode:

    def __init__(self, nodeId, navigationGraphId, value=1, event=None):
        self.navigationGraphId = navigationGraphId
        self.nodeId = nodeId
        self.value = value
        self.event = 'NODE_RESERVATION_FREED' if event is None else 'NODE_RESERVATION_FREED'

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, newValue):
        if isinstance(newValue, int):
            if newValue == 0:
                raise ValueError('Value cannot be zero.')
            else:
                self._value = newValue
        else:
            raise TypeError('Value must be of type integer.')

    @property
    def navigationGraphId(self):
        return self._navigationGraphId

    @navigationGraphId.setter
    def navigationGraphId(self, newId):
        if isinstance(newId, str):
            self._navigationGraphId = newId
        else:
            raise TypeError('NavigationGraphId must be of type string.')

    @property
    def nodeId(self):
        return self._nodeId

    @nodeId.setter
    def nodeId(self, newId):
        if isinstance(newId, str):
            self._nodeId = newId
        else:
            raise TypeError('NodeId must be of type string.')

    @property
    def event(self):
        return self._event

    @event.setter
    def event(self, newEvent):
        if isinstance(newEvent, str):
            if newEvent in ['NODE_RESERVATION_FREED']:
                self._event = newEvent
            else:
                raise ValueError('Event must be \'NODE_RESERVATION_FREED\'.')
        else:
            raise TypeError('Event must be of type string.')

    def __eq__(self, other):
        if other.nodeId == self.nodeId and other.navigationGraphId == self.navigationGraphId:
            return True
        else:
            return False

    def __ne__(self, other):
        if other.nodeId != self.nodeId or other.navigationGraphId != self.navigationGraphId:
            return True
        else:
            return False

    def toJson(self):
        return {
            'event': self.event,
            'nodeId': self.nodeId,
            'navigationGraphId': self.navigationGraphId,
            'value': self.value
        }


class Point:
    def __init__(self, x, y):
        self._x = x
        self._y = y

    @property
    def x(self):
        return self._x

    @x.setter
    def x(self, value):
        if isinstance(value, float):
            self._x = value
        else:
            raise TypeError('x must be a number.')

    @property
    def y(self):
        return self._y

    @y.setter
    def y(self, value):
        if isinstance(value, float):
            self._y = value
        else:
            raise TypeError('x must be a number.')

    def __eq__(self, other):
        if self.x == other.x and self.y == other.y:
            return True
        else:
            return False

    def toJson(self):
        return {
            'mapX': self.x,
            'mapY': self.y
        }


class Area:
    def __init__(self, name):
        self._name = name
        self._points = list()

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, newName):
        if isinstance(newName, str):
            self._name = newName
        else:
            raise TypeError('Name property must be a string.')

    @property
    def points(self):
        return self._points

    @points.setter
    def points(self, newPoints):
        raise NotImplementedError('Use addPoint function to add point to Emergency Detector.')

    def __eq__(self, other):
        if self.name == other.name:
            return True
        else:
            return False

    def addPoint(self, newPoint):
        if not isinstance(newPoint, Point):
            raise TypeError('Must be of type Point')
        if newPoint in self.points:
            raise ValueError(f'Point {newPoint.toJson()} already assigned to area.')
        else:
            self._points.append(newPoint)

    def toJson(self):
        return {
            'id': self.name,
            'points': [point.toJson() for point in self.points]
        }


class EmergencyDetector:
    def __init__(self, name=str()):
        self._name = name
        self._areas = list()

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, newName):
        if isinstance(newName, str):
            self._name = newName
        else:
            raise TypeError('Name property must be a string.')

    @property
    def areas(self):
        return self._areas

    @areas.setter
    def areas(self, newAreas):
        raise NotImplementedError('Use addArea function to add areas to Emergency Detector.')

    def __eq__(self, other):
        if self.name == other.name:
            return True
        else:
            return False

    def addArea(self, newArea):
        if not isinstance(newArea, Area):
            raise TypeError('Must be of type Area')
        if newArea in self.areas:
            raise ValueError(f'Area {newArea.name} already assigned to emergency detector.')
        else:
            self._areas.append(newArea)

    def toJson(self):
        return {
            'id': self.name,
            'areas': [area.name for area in self.areas]
        }
