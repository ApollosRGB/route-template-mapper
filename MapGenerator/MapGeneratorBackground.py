# -*- coding: utf-8 -*-

import matplotlib
import os
import numpy as np


class Background:

    def __init__(self, imagePath=None, imageName=None):
        self._imagePath = imagePath
        self._imageName = imageName
        self._extent = None
        self._drawn = False
        self.image = None
        self._imagePlot = None
        self._pixelToMeters = 1.0

        if imagePath is not None and imageName is not None:
            self.openImage()

    def addFile(self, fullFileName):
        _, fileExtension = os.path.splitext(fullFileName)
        if fileExtension not in ['.png']:
            raise ValueError('Not supported file type for background: '+str(fileExtension)+' - Use \'.png\'.')
        self._imageName = os.path.basename(fullFileName)
        self._imagePath = os.path.dirname(fullFileName)
        if self._imagePath is None:
            self._imagePath = os.getcwd()

    def openImage(self):
        #with open(self._imagePath + '/' + self._imageName) as file:
        self.image = matplotlib.image.imread(self._imagePath + '/' + self._imageName)
        self.flip('vertical')

    def showBackground(self, axis):
        if self.image is not None:
            if self._imagePlot is not None:
                #self._imagePlot.remove()
                self.updateExtent()
                self._imagePlot.set_data(self.image)
                self._drawn = True
            else:
                self.updateExtent()
                self._imagePlot = axis.imshow(self.image, aspect='auto', origin='lower', extent=self._extent)
                self._drawn = True
        else:
            return

    def deleteBackground(self):
        if self._imagePlot is not None:
            self._imagePlot.remove()
        self.image = None
        self._imagePlot = None
        self._imageName = None
        self._imagePath = None
        self._drawn = False
        return

    def getSize(self):
        image_y = np.size(self.image, 0)
        image_x = np.size(self.image, 1)
        return image_x, image_y

    def setPixelToMeters(self, pixelToMeters):
        self._pixelToMeters = pixelToMeters
        self.updateExtent()

    def updateExtent(self):
        image_x, image_y = self.getSize()
        xlim = image_x * self._pixelToMeters
        ylim = image_y * self._pixelToMeters
        self._extent = [0, xlim, 0, ylim]

    def mapLimits(self):
        image_x, image_y = self.getSize()
        return image_x * self._pixelToMeters, image_y * self._pixelToMeters

    def transpose(self, dX, dY):
        if dX == 0 and dY == 0:
            return
        if self._extent is None:
            image_x, image_y = self.getSize()
            self._extent = [0, image_x, 0, image_y]
        self._extent[0] += dX
        self._extent[1] += dX
        self._extent[2] += dY
        self._extent[3] += dY
        return

    def flip(self, flipType):
        if flipType == 'horizontal':
            self.image = np.fliplr(self.image)
        elif flipType == 'vertical':
            self.image = np.flipud(self.image)
        self._drawn = False

