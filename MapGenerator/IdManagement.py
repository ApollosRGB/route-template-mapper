from enum import Enum


class IdOption(Enum):
    fourDigits = 1
    eightDigits = 2


NUMBER_RANGE = range(99)
ID_RANGE = range(9999)


class Manager:

    def __init__(self, idOption=IdOption.fourDigits):
        self._idList = list()
        self._idOption = idOption
        self.createIdList()

    def createIdList(self):
        self._idList = list()
        if self._idOption == IdOption.fourDigits:
            self._idList = ['{0:04}'.format(i) for i in ID_RANGE]
        elif self._idOption == IdOption.eightDigits:
            self._idList = ['{first:02}-{middle:02}-{last:02}'.format(first=first, middle=middle, last=last)
                            for first in NUMBER_RANGE for middle in NUMBER_RANGE for last in NUMBER_RANGE]
        else:
            print('Unknown ID option!')

    def getNewId(self):
        if self._idList:
            return self._idList.pop(0)
        else:
            print('no more unique Ids available!')
            return None

    def freeId(self, freedId):
        self._idList.append(freedId)

    def useId(self, usedId):
        if usedId in self._idList:
            self._idList.remove(usedId)

    def updateIdList(self, obj_dict_list):
        for obj_dict in obj_dict_list:
            if obj_dict['id'] in self._idList:
                self._idList.remove(obj_dict['id'])

    @property
    def idOption(self):
        return self._idOption

    @idOption.setter
    def idOption(self, newOption):
        # need to test if option is valid
        self._idOption = newOption
        self.createIdList()

