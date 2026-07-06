import os
import json
import MapGeneratorEditor
import MapGeneratorBackground
import MapGeneratorJson


class MapProject:
    def __init__(self, editorMap, backgroundMap, path=str(), name=str(), ):
        self._path = path
        self._dir = str()
        self._name = name
        self._projectFile = None
        self._mapFile = None
        self._backgroundFile = None
        self._editorMap = editorMap
        self._backgroundMap = backgroundMap

    def addMap(self, editorMap):
        self._editorMap = editorMap

    def addBackground(self, backgroundMap):
        self._backgroundMap = backgroundMap

    def resetDir(self):
        self._dir = str()

    def _createMetaData(self):
        metaData = {
            'mapFile': str(),
            'backgroundFile': str(),
            'imageExtent': [0, 0, 0, 0]
        }
        if self._backgroundMap is not None:
            metaData['imageExtent'] = self._backgroundMap._extent

        return metaData

    @staticmethod
    def getFileName(name):
        fileName = os.path.basename(name)
        filePath = os.path.dirname(name)
        if filePath is None:
            filePath = os.getcwd()
        fileName = os.path.splitext(fileName)[0]
        return fileName, filePath

    @staticmethod
    def projectInPath(path, name):
        return os.path.isfile(path+'/'+name+'_project'+'.json')

    def saveProject(self, path=str(), name=str()):
        if path:
            self._path = path
            self.resetDir()
        else:
            pass
        if name:
            self._name = name
            self.resetDir()
        else:
            self._name = self._path.split('/')[-1]
            if not self.projectInPath(self._path, self._name):
                self._name = 'defaultProjectName'

        if not self._dir and not self.projectInPath(self._path, self._name):
            try:
                os.mkdir(self._path + '/' + self._name)
            except OSError:
                print("Creation of the directory %s failed" % self._path)
                return
            else:
                print("Successfully created the directory %s " % self._path)

        self._dir = '/' + self._name
        metaData = self._createMetaData()

        with open(self._path + self._dir + '_project' + '.json', "w+") as file:
            json.dump(metaData, file, indent=4)

