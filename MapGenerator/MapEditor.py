import platform
import FreeSimpleGUI as sg
import tkinter
import matplotlib
import MapGeneratorEditor
import MapGeneratorEditorEvents
import MapGeneratorEditorWindows
import MapEditorDesign
from MapGeneratorMode import Mode


def drawCanvas(canvas, editor):
    editor.drawMap()
    canvas.draw()
    canvas.get_tk_widget().pack(side='top', fill=None, expand=False)


def getDisplaySize():
    root = tkinter.Tk()
    if platform.system() == 'Linux' :
        root.attributes('-zoomed', True)
    else :
        root.state("zoomed")
    root.update_idletasks()
    root.withdraw()
    display_width = root.winfo_screenwidth()
    display_height = root.winfo_screenheight()
    usable_width = root.winfo_width()
    usable_height = root.winfo_height()
    font = tkinter.font.Font(family="Calibri", size=11, weight="normal")
    character_width = font.measure("0")
    return usable_width, usable_height, character_width


class MapEditor:
    def __init__(self):
        MapEditorDesign.setSynaosDesign()
        self._displayWidth, self._displayHeight, self._characterWidth = getDisplaySize()
        ratio = self._displayWidth / self._displayHeight
        charactersButtonArea = 42
        editor_width = self._displayWidth - charactersButtonArea * self._characterWidth
        editor_height = self._displayHeight
        self.editor = self.startEditor(editor_width, editor_height)
        if self.editor is not None:
            self.canvas = self.createCanvas()
            self.layout = self.assignLayout()
            self.window = self.createWindow()
            self.active = True
            self.TKCanvas = self.createTKCanvas()
            self.editor.updateCanvas(self.TKCanvas)
            self.editor.figConnect()
            self.connectWithEditor()
            self.startEditorLoop()

    def createCanvas(self):
        ratio = self._displayWidth / self._displayHeight
        editor_width = self._displayWidth - 42 * self._characterWidth
        editor_height = editor_width * ratio
        size = (editor_width, editor_height)
        canvas = sg.Canvas(size=size, background_color='white',
                           key='canvas')
        return canvas

    def createTKCanvas(self):
        return matplotlib.backends.backend_tkagg.FigureCanvasTkAgg(self.editor._fig, self.canvas.TKCanvas)

    @staticmethod
    def startEditor(sizeX, sizeY):
        return MapGeneratorEditor.MapGeneratorEditor(fig_size_x=sizeX, fig_size_y=sizeY,
                                                     map_size_x=None, map_size_y=None)

    def deactivateEditorWindow(self):
            self.toggleElementStates(disable=True)
            self.editor.figDisconnect()
            self.active = False

    def activateEditorWindow(self):
        try:
            self.toggleElementStates(disable=False)
            self.editor.figConnect()
            self.active = True
        except:
            return

    def toggleElementStates(self, disable=False):
        for element in self.window.element_list():
            if isinstance(element, sg.Button):
                element.Update(disabled=disable)

    def connectWithEditor(self):
        self.editor.connectToFrontEnd(self)

    def assignLayout(self):
        layout = MapEditorDesign.createLayout(self.canvas)
        return layout

    def createWindow(self):
        window = sg.Window('SYNAOS Map Editor', self.layout, icon='icons/MapEditor.ico', return_keyboard_events=True, resizable=True, finalize=True)
        window.Maximize()
        return window

    def drawCanvas(self):
        self.editor.drawMap()
        self.TKCanvas.draw()
        self.TKCanvas.get_tk_widget().pack(side='top', fill=None, expand=False)

    def buttonToggleMode(self):
        try:
            if self.editor._mode == Mode.dependencies:
                self.toggleButton(buttonKey='dependenciesMode', setActive=True)
            else:
                self.toggleButton(buttonKey='dependenciesMode', setActive=False)
            if self.editor._lockNodes:
                self.toggleButton(buttonKey='lockNodes', setActive=True)
            else:
                self.toggleButton(buttonKey='lockNodes', setActive=False)
            if self.editor._mode == Mode.stations:
                self.toggleButton(buttonKey='stations', setActive=True)
            else:
                self.toggleButton(buttonKey='stations', setActive=False)
            if self.editor._mode == Mode.lights:
                self.toggleButton(buttonKey='lights', setActive=True)
            else:
                self.toggleButton(buttonKey='lights', setActive=False)
            if self.editor._mode == Mode.chargers:
                self.toggleButton(buttonKey='charger', setActive=True)
            else:
                self.toggleButton(buttonKey='charger', setActive=False)
        except Exception as error:
            print('Error while trying to toggle buttons event:', error)

    def toggleButton(self, buttonKey, setActive=False):
        if setActive:
            self.window.find_element(buttonKey).Update(
                button_color=(MapEditorDesign.SYNAOS_COLORS['white'], MapEditorDesign.SYNAOS_COLORS['trueBlue']))
        else:
            self.window.find_element(buttonKey).Update(
                button_color=(MapEditorDesign.SYNAOS_COLORS['white'], MapEditorDesign.SYNAOS_COLORS['darkBlue']))

    def infoPanelUpdate(self, infoId, infoX, infoY, infoLength):
        self.window.find_element('infoId').Update(str(infoId))
        self.window.find_element('infoX').Update(str(infoX))
        self.window.find_element('infoY').Update(str(infoY))
        self.window.find_element('infoLength').Update(str(infoLength))

    def activeGraphUpdate(self):
        try:
            graphIdList = self.editor.getGraphListAsString()
            activeGraphId = str(self.editor.activeGraph._graphId)
            self.window.find_element('activeGraphMap').Update(values=graphIdList,
                                                             set_to_index=str(graphIdList.index(activeGraphId)))
            self.window.find_element('activeGraph').Update(values=graphIdList,
                                                          set_to_index=str(graphIdList.index(activeGraphId)))
        except Exception as error:
            print('Setting active graph failed due to:', error)

    def startEditorLoop(self):
        self.activeGraphUpdate()
        while True:
            if self.active:
                self.editor.drawCanvas()
                eventMain, values = self.window.read()
                if eventMain is None:
                    break
                elif eventMain != '__timeout__':
                    self.editor.eventHandler.onKeyEvents(eventMain)
                    self.editor.eventHandler.GUIButtonEvent(eventMain, values)
                    self.buttonToggleMode()
                    self.activeGraphUpdate()

        self.window.close()


def main():
    MapEditor()


if __name__ == "__main__":
    main()
