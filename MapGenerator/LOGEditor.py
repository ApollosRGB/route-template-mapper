import json


class LogStruct:
    def __init__(self, name, logcontroller=[], areas=[], locations=[], gates=[], intersections=[], lights=[], chargers=[]):
        self.structure = {'name': name,
                          'logcontroller': logcontroller.copy()}
        self.logController = logcontroller
        self.areas = areas
        self.locations = locations
        self.gates = gates
        self.intersections = intersections
        self.trafficLights = lights
        self.chargers = chargers

    def addLOGController(self, logcont):
        self.structure['logcontroller'].append(logcont.structure)

    def addElementToStructure(self, element):
        if isinstance(element, LogController):
            self.logController.append(element)
        elif isinstance(element, AutomaticArea):
            self.areas.append(element)
        elif isinstance(element, EntryLocation):
            self.locations.append(element)
        elif isinstance(element, Gate):
            self.gates.append(element)
        elif isinstance(element, Intersection):
            self.intersections.append(element)
        elif isinstance(element, TrafficLight):
            self.trafficLights.append(element)
        elif isinstance(element, Charger):
            self.chargers.append(element)

    def getGateFromList(self, gateId):
        for gate in self.gates:
            if gate.structure['id'] == gateId:
                return gate
        return False

    def getElements(self):
        elements = []
        for logc in self.logController:
            elements.append('LogController: '+logc.structure['id'])
        for area in self.areas:
            elements.append('Automaticarea: '+area.structure['id'])
        for location in self.locations:
            elements.append('Entrylocation: '+location.structure['id'])
        for intersection in self.intersections:
            elements.append('Intersection: '+intersection.structure['id'])
        for charger in self.chargers:
            elements.append('Charger: '+charger.structure['id'])
        return elements


class LogController(dict):
    def __init__(self, Id, automaticareas=[], intersections=[], chargers=[]):
        self.structure = {'id': Id}
        if automaticareas:
            for area in automaticareas:
                self.addAutomaticArea(area)
        if intersections:
            for intersection in intersections:
                self.addAutomaticArea(intersection)

    def addAutomaticArea(self, area):
        if 'automaticarea' not in self.structure.keys():
            self.structure['automaticarea'] = [area.structure]
        else:
            self.structure['automaticarea'].append(area.structure)

    def getAutomaticAreas(self):
        areas = []
        for area in self.structure['automaticarea']:
            areas.append('Area '+str(area['id']))
        return areas

    def addIntersection(self, intersection):
        if 'intersection' not in self.structure.keys():
            self.structure['intersection'] = [intersection.structure]
        else:
            self.structure['intersection'].append(intersection.structure)

    def addCharger(self, charger):
        if 'charger' not in self.structure.keys():
            self.structure['charger'] = [charger.structure]
        else:
            self.structure['charger'].append(charger.structure)


class AutomaticArea:
    def __init__(self, Id, entrylocations=[]):
        self.structure = {'id': Id,
                          'entrylocation': entrylocations.copy()}
        return

    def addEntryLocation(self, entryLocation):
        self.structure['entrylocation'].append(entryLocation.structure)

    def getEntryLocations(self):
        locations = []
        for location in self.structure['entrylocation']:
            locations.append('Location '+str(location['id']))
        return locations


class EntryLocation:
    def __init__(self, Id, gates=[]):
        self.structure = {'id': Id,
                          'gates': gates.copy()}
        return

    def addGate(self, gate):
        self.structure['gates'].append(gate.structure)

    def getGates(self):
        gates = []
        for gate in self.structure['gates']:
            gates.append('Gate '+str(gate['id']))
        return gates


class Gate:
    def __init__(self, Id, ssid=None, ip='192.168.1.1'):
        self.structure = {'id': Id,
                          'ip': ip,
                          'ssid': ssid}
        return


class Intersection:
    def __init__(self, Id, trafficLights=[]):
        self.structure = {'id': Id,
                          'lights': trafficLights.copy()}
        return

    def addTrafficLight(self, light):
        self.structure['lights'].append(light.structure)

    def getTrafficLights(self):
        lights = []
        for light in self.structure['lights']:
            lights.append('Light '+str(light['id']))
        return lights


class TrafficLight:
    def __init__(self, Id):
        self.structure = {'id': Id}
        return


class Charger:
    def __init__(self, Id, chargerStations=[]):
        self.structure = {'id': Id,
                          'stations': chargerStations.copy()}
        return

    def addChargerStation(self, chargerStation):
        self.structure['stations'].append(chargerStation.structure)

    def getChargerStations(self):
        chargerStations = []
        for chargerStation in self.structure['stations']:
            chargerStations.append('Station ' + str(chargerStation['id']))
        return chargerStations


class ChargerStation:
    def __init__(self, Id):
        self.structure = {'id': Id}
        return


def convertOldMapModel(logstruct, nodes):
    for node in nodes:
        if 'gate' in node:
            gate = Gate(node['gate']['id'], node['id'], '192.168.1.1')
            logstruct.addElementToStructure(gate)
    for node in nodes:
        if 'entryLocation' in node:
            logcontroller = LogController('LOGC' + node['id'])
            area = AutomaticArea('AREA' + node['id'])
            location = EntryLocation(node['entryLocation']['id'])
            if 'gates' in node['entryLocation']:
                for gate in node['entryLocation']['gates']:
                    location.addGate(logstruct.getGateFromList(gate))
            else:
                print('Entrylocation (ID: ' + str(node['entryLocation']['id']) + ') does not have any gates associated with it!')
            area.addEntryLocation(location)
            logcontroller.addAutomaticArea(area)
            logstruct.addLOGController(logcontroller)
            logstruct.addElementToStructure(logcontroller)
            logstruct.addElementToStructure(area)
            logstruct.addElementToStructure(location)


def convertMap(logstruct, handlingStationGroups, handlingStations, trafficLights, chargerStations):
    for station in handlingStations:
        gate = Gate(station.getId(), station.getId(), '192.168.1.1')
        logstruct.addElementToStructure(gate)

    for group in handlingStationGroups:
        logController = LogController('LOGC_' + group.getId())
        area = AutomaticArea('AREA_' + group.getId())
        location = EntryLocation(group.getId())
        for station in group.getStations():
            gate = Gate(station.getId(), station.getId(), '192.168.1.1')
            location.addGate(gate)
        area.addEntryLocation(location)
        logController.addAutomaticArea(area)
        logstruct.addLOGController(logController)
        logstruct.addElementToStructure(logController)
        logstruct.addElementToStructure(area)
        logstruct.addElementToStructure(location)

    for trafficLight in trafficLights:
        logController = LogController('LOGC_' + trafficLight.getId())
        intersection = Intersection(Id='intersection_'+trafficLight.getId())
        light = TrafficLight(Id=trafficLight.getId())
        intersection.addTrafficLight(light)
        logController.addIntersection(intersection)
        logstruct.addLOGController(logController)

    for station in chargerStations:
        logController = LogController('LOGC_' + station.getId())
        charger = Charger(Id='charger_' + station.getId())
        chargerStation = ChargerStation(station.getId())
        charger.addChargerStation(chargerStation)
        logController.addCharger(charger)
        logstruct.addLOGController(logController)


def JsonLogStructureWriter(logStructure, path, name):
    if logStructure:
        with open(path + '/' + name + '.json', "w+") as file:
            json.dump(logStructure, file, indent=2)



