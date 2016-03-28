'''
Opens a text file to parse it interactively with the user to create notes

Created on 21 Jul 2011

@author: toby
'''

import tkFileDialog
import os, sys, tty, termios # for our 'press any key to continue' thing and _GetchUnix
import time
from Note import Note

from colorama import init, Fore, Style



class GetchUnix:
    """Gets a single character from standard input.  Does not echo to the screen.
    
    Code from http://code.activestate.com/recipes/134892/
    Slightly edited. BLAH only works on Unix"""
    
    def __init__(self):
        # import tty, sys # already imported
        pass

    def __call__(self):
        # import sys, tty, termios # already imported
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return ord(ch) # changed to ord so we just get the number
    
    # all the arrow keys return 27
    # backspace is 127
    # return is 13 (or 10)

getch = GetchUnix() # just have to run, for example, x = getch() in order to get a int value representing a char


def pause(showPressAnyKey = False):
    """ Prompt the user to press a key to continue.
    
    Taken from http://www.thensys.com/?p=66
    Modified so that unless it is passed True, it doesn't say anything"""
    
    if sys.platform in ('win32', 'win64'):
        os.system('PAUSE')
    elif sys.stdin.isatty():
        if showPressAnyKey: sys.stdout.write('Press any key to continue')
        tty.setraw(sys.stdin.fileno())
        try:
            sys.stdin.read(1)
        finally:
            os.system("stty sane")


def consume():
    """Opens a text file to parse it interactively with the user to create notes.
    
    We can simply prepare a string as per the formatted data files, and then pass it
    to the Notes constructor to be parsed"""
    
    nonDefaultTags = set() # this will hold all of the non default tags
    
    init() # this initializes colorama
    
    ###### LOAD FILE ######
    
    print 'Please choose a file to import'
    filename = tkFileDialog.askopenfilename()
    #filename = 'testinput.txt' # BLAH
    if filename == '':
        print 'Import cancelled by you!'
        return
    
    print 'Preparing to import file '+filename
    inlines = open(filename).read().split('\n') # inlines is a list of lines in the file
    for i, line in enumerate(inlines):
        inlines[i] = line.strip() # get rid of trailing carriage returns, etc.
    
    
    ###### SET DEFAULT TAGS ######
    
    os.system('clear')
    print Fore.GREEN, # output from now on will be green @UndefinedVariable
    
    print "\rPlease enter the tags, if any, that you would like applied to every not in this import, followed by the Enter key."
    print "A piece of data may be associated with that tag using a colon, as in 'source:new york times'."
    print "Press Enter on an empty line to move to the next step"
    print Style.BRIGHT #@UndefinedVariable
    defaultTags = set() # this will be turned into a section that can be fed, on its own, to the parser in the Note constructor
    input = raw_input()
    while input != '': # until we get an empty tag
        defaultTags.add(input) # PS we're using a set so we don't get duplicates
        input = raw_input()
    print Style.NORMAL, #@UndefinedVariable
    if len(defaultTags) == 0: print "\rCool, no default tags.\n"
    else: print "\rGreat.\n"
    
    
    ###### SET DEFAULT TIMESTAMP ######
    
    print Fore.CYAN + "Now please enter a default timestamp you would like for every note in this import." #@UndefinedVariable
    print "This should be in your local timezone (if you care about the minor differences timezones may introduce) and in 24-hour format, of the form YYYY-MM-DD-HH:MM:SS, though you can omit more precise values and just, for example, choose a year and month."
    print "You can override the default time on a per-note basis. If you want the default creation time to be blank, simply press Enter, or type 'now' for the current date and time."
    print Style.BRIGHT #@UndefinedVariable
    timestamp = raw_input()
    
    if timestamp == 'now':
        timestamp = time.strftime("%Y-%m-%d-%H:%M:%S")
    
    print Style.NORMAL, #@UndefinedVariable
    if timestamp == "":
        print "\rAlright, no default timestamp"
        timestamp = None
    else:
        timestamp = Note.parseTime(timestamp) # turn it into epoch seconds
        print "\nAlright, the default time for these notes will be "+Style.BRIGHT+Note.parseEpochNicely(timestamp)+Style.NORMAL #@UndefinedVariable
    
    offset = 0 # this number of seconds will be added to every successive note that takes the default time
    noOffsetYet = True # until the first time the default time is used, this remains true so we know NOT to use the offset
    
    if timestamp != None:
        print "\nWould you like the default timestamp for each successive note in this import to be incremented or decremented by a certain amount? You will still be able to choose a non-default timestamp for a particular note."
        print "This could be useful to maintain the same (or reverse) order found in this import when sorting notes by date."
        print "Please enter one of the following options:"
        print
        print Style.BRIGHT+"0"+Style.NORMAL+":  Leave the default timestamp identical for all notes" #@UndefinedVariable
        print
        print Style.BRIGHT+"1"+Style.NORMAL+":  Set each successive note to be 1 year older" #@UndefinedVariable
        print Style.BRIGHT+"2"+Style.NORMAL+":  Set each successive note to be 30 days older" #@UndefinedVariable
        print Style.BRIGHT+"3"+Style.NORMAL+":  Set each successive note to be 1 day older" #@UndefinedVariable
        print Style.BRIGHT+"4"+Style.NORMAL+":  Set each successive note to be 1 hour older" #@UndefinedVariable
        print Style.BRIGHT+"5"+Style.NORMAL+":  Set each successive note to be 1 minute older" #@UndefinedVariable
        print Style.BRIGHT+"6"+Style.NORMAL+":  Set each successive note to be 1 second older" #@UndefinedVariable
        print
        print Style.BRIGHT+"7"+Style.NORMAL+":  Set each successive note to be 1 year more recent" #@UndefinedVariable
        print Style.BRIGHT+"8"+Style.NORMAL+":  Set each successive note to be 31 days more recent" #@UndefinedVariable
        print Style.BRIGHT+"9"+Style.NORMAL+":  Set each successive note to be 1 day more recent" #@UndefinedVariable
        print Style.BRIGHT+"10"+Style.NORMAL+": Set each successive note to be 1 hour more recent" #@UndefinedVariable
        print Style.BRIGHT+"11"+Style.NORMAL+": Set each successive note to be 1 minute more recent" #@UndefinedVariable
        print Style.BRIGHT+"12"+Style.NORMAL+": Set each successive note to be 1 second more recent" #@UndefinedVariable
        print Style.BRIGHT #@UndefinedVariable
    
        # get their answer
        while True:
            answer = raw_input()
            if not answer.isdigit(): # if they gave us something with letters
                print Style.NORMAL+"We did not recognize your answer! Please type a number from 0 through 12 to answer."+Style.BRIGHT #@UndefinedVariable
            else: # if it IS all digits
                answer = int(answer) # convert it to an int
                if answer <0 or answer >12: # if it's out of the range
                    print Style.NORMAL+"The options only go from 0 through to 12!"+Style.BRIGHT #@UndefinedVariable
                else:
                    if answer == 1: offset = -365*24*60*60 # negative the number of seconds in a year!
                    elif answer == 2: offset = -30*24*60*60
                    elif answer == 3: offset = -24*60*60
                    elif answer == 4: offset = -60*60
                    elif answer == 5: offset = -60
                    elif answer == 6: offset = -1
                    elif answer == 7: offset = 365*24*60*60 # positive the number of seconds in a year!
                    elif answer == 8: offset = 31*24*60*60
                    elif answer == 9: offset = 24*60*60
                    elif answer == 10: offset = 60*60
                    elif answer == 11: offset = 60
                    elif answer == 12: offset = 1
                    
                    break
                
        print Style.NORMAL+"\nSounds like a plan." #@UndefinedVariable
    
    ###### GIVE INSTRUCTIONS ######
    
    print Fore.MAGENTA, Style.BRIGHT #@UndefinedVariable
    print "\nNow we're going to start parsing the notes."
    print "You will see a proposed note in bold, followed by a line that is not in bold."
    print "If the currently bolded text is a complete note, press Enter - if you wish to extend the note with the un-bolded text press the down arrow. Press Backspace if you wish to undo the inclusion of the latest line. Press 'x' if you wish to discard the bolded lines and not save them as a note."
    print "Repeat until you are satisfied with the note. You may press 'q' at any time to quit (notes already completed will be saved)."
    print "\nPress any key to begin."+Style.RESET_ALL #@UndefinedVariable
    pause()
        
    i = 0 # keep track of where we are in inlines
    # each iteration of the following while loop will generate one note
    while i != len(inlines): # until we get to the end of the file (once the index reaches end of lines)
        
        ###### GET TEXT OF ONE NOTE ######
        
        while i != len(inlines) and inlines[i] == '': # if our current line is blank and we're not at the end of the file
            i += 1 # we're never going to want to start the text of a note with blank lines
        if i == len(inlines): break # then we got to the end by trimming blank lines, and we should break
        
        text = [inlines[i]] # each note starts afresh with just the one line
        os.system('clear')
        
        bold = Fore.WHITE + Style.BRIGHT #@UndefinedVariable
        mag = Fore.MAGENTA + Style.BRIGHT #@UndefinedVariable
        reset = Fore.WHITE + Style.NORMAL #@UndefinedVariable
        shortcuts = '\r'+reset+"Press "+mag+"Enter"+reset+" to accept, "+mag+"down"+reset+" to add next line, "+mag+"x"+reset+" to discard bolded lines, "+mag+"q"+reset+" to quit.\n"
        tagColor = Fore.GREEN + Style.BRIGHT #@UndefinedVariable
        timeColor = Fore.CYAN + Style.BRIGHT #@UndefinedVariable
        
        print shortcuts
        print bold+'\n'.join(text) # what we have so far
        i += 1
        if i != len(inlines): # if there is any more to print
            print reset+inlines[i]
        inkey = getch()
        
        # the following loop repeatedly gets keypresses and modifies the text in the current note
        while inkey != 10 and inkey != 13: # if we get 10 or 13 then they've hit return
            if inkey == 27 and i != (len(inlines)): # if they pressed an arrow key and we're not at the last line
                text.append(inlines[i])
                os.system('clear')
                print shortcuts
                print bold+'\r\n'.join(text) # what we have so far
                i+=1
                if i != len(inlines): # if we're not past the end of the document
                    print reset+inlines[i], # and then print the newest line in regular
            elif inkey == 127 and i > 1 and len(text)>1: # if they pressed backspace and it's not the beginning and there is something to remove, we delete the latest line
                text.pop() # cut out the last line
                os.system('clear')
                print shortcuts
                print bold+'\r\n'.join(text) # what we have how
                i-=1
                print reset+inlines[i], # and then print the newest line in regular
            elif inkey == ord('x') or inkey == ord('X'):
                if i == len(inlines)-1: # if we're at the last line
                    text = [] # set us to empty
                    os.system('clear')
                    break # we're done
                text = [inlines[i]] # discard the current text and start with just the current line
                os.system('clear')
                print shortcuts
                print bold+'\r\n'.join(text) # what we have so far
                i+=1
                print reset+inlines[i], # and then print the newest line in regular
            elif inkey == ord('q') or inkey == ord('Q'):
                text = [] # this will cause the outer loop to break as well
                os.system('clear')
                print "\rQuitting import..."
                break # we're done

            inkey = getch() # regardless, loop again 
        
        # finished keypress loop, we now have the full text of one note
        
        ###### FINISHED GETTING TEXT OF ONE NOTE ######
        
        if text == []: break # then we're done or we quit
        
        os.system('clear')
        print reset+'\rYour note is:\n'
        print bold+'\n'.join(text) # print what we have
        
        
        ###### GET TAGS AND TIMESTAMP FOR ONE NOTE ######
        
        if len(defaultTags) == 0: # we have no default tags
            print reset+"\nYou have not set any default tags to be applied to all notes."
            if len(nonDefaultTags) != 0:
                print '\nTags you have used previously in this import are listed here for your convenience:'
                print tagColor + Style.NORMAL + ', '.join(sorted(nonDefaultTags.difference(defaultTags))) + reset #@UndefinedVariable
            print 'Please enter the '+Fore.GREEN+'tags'+reset+' for this note, if any.' #@UndefinedVariable
        else:
            print reset+'\nDefault tags you have set that will be attached to this note:\n' # start off with a line break cause we probably ended without one
            print tagColor+'\n'.join(defaultTags)+reset
            if len(nonDefaultTags) != 0:
                print '\nOther tags you have used previously in this import are listed here for your convenience:'
                print tagColor + Style.NORMAL + ', '.join(sorted(nonDefaultTags.difference(defaultTags))) + reset #@UndefinedVariable
            print '\nPlease enter other '+Fore.GREEN+'tags'+reset+' beyond the defaults above, if any.' #@UndefinedVariable

        print tagColor
        tags = set().union(defaultTags) # a copy of defaultTags
        input = raw_input()
        while input != '': # until we get an empty tag
            tags.add(input)
            input = raw_input()
        
        print reset,
        if timestamp == None: print '\rNow please enter the '+Fore.CYAN+'timestamp'+reset+' you would like for this note, or press Enter to leave it blank.\n'+timeColor #@UndefinedVariable
        elif noOffsetYet or offset == 0:
            print '\rNow please enter a '+Fore.CYAN+'timestamp'+reset+' for this note, or leave blank to keep the default of '+timeColor+Note.parseEpochNicely(timestamp)+reset+".\n"+timeColor #@UndefinedVariable
        else: # if we ARE using the offset
            print '\rNow please enter a '+Fore.CYAN+'timestamp'+reset+' for this note, or leave blank to keep the incremented default of '+timeColor+Note.parseEpochNicely(timestamp+offset)+reset+".\n"+timeColor #@UndefinedVariable
        
        usingDefaultTimestamp = True
        newTimestamp = raw_input()
        if newTimestamp != "": # if they did enter a non-default timestamp
            usingDefaultTimestamp = False
            newTimestamp = Note.parseTime(newTimestamp) # convert this new time to epoch seconds
            print reset+"\nTimestamp for this note will be "+timeColor+Note.parseEpochNicely(newTimestamp)+reset
        elif timestamp == None: # if they did not enter a new timestamp AND we have no default timestamp
            print reset+"Timestamp for this note will remain blank."
        else: # we're using default time
            if offset == 0: # if we're not using offset
                print reset+"Timestamp for this note will be the default: "+timeColor+Note.parseEpochNicely(timestamp)+reset
            elif noOffsetYet: # if this is the first time we're using the default time
                noOffsetYet = False # next time we will use offset
                print reset+"Timestamp for this note will be the default: "+timeColor+Note.parseEpochNicely(timestamp)+reset
            else:
                timestamp += offset # permanently change the default timestamp
                print reset+"Timestamp for this note will be the incremented default: "+timeColor+Note.parseEpochNicely(timestamp)+reset
        
        
        ###### FINISHED GETTING TAGS AND TIMESTAMP FOR ONE NOTE ######
        
        
        ###### CREATING NOTE ######
        
        STRIP_CHARS = '-' # these are characters to be removed from the beginning and end of text BLAH SHOULD READ FROM CONFIG FILE
        
        finalText = ('\n'.join(text)).strip(' '+STRIP_CHARS) # make a string out of the list, and get rid of any possible trailing line breaks
        
        if len(tags) != 0: # if there are tags
            nonDefaultTags = nonDefaultTags.union(tags)
            tagList = list(tags) # turn the set into a list so we can put ordered stuff at beginning and end of it
            tagList = ['##!##TAGS##!##'] + tagList # prepend it with this so parser can recognize it
            tagList.append('##!##TAGSDONE##!##') # also for parser
            newNote = Note(finalText, parseMe='\n'.join(tagList)) # BLAH NEED TO DEAL WITH TIME STAMPS
        else:
            newNote = Note(finalText) # BLAH NEED TO DEAL WITH TIME STAMPS
        
        if not usingDefaultTimestamp: # if we have a custom, nondefault timestamp
            newNote.changeTimeCreate(newTimestamp) # also sets modified time to now, and saves
        elif timestamp != None: # else we are using default timestamp, and it exists
            newNote.changeTimeCreate(timestamp) # also sets modified time to now, and saves
        else:
            newNote.modified() # this will set the modified time to now, and save
        
        print Fore.RED+Style.BRIGHT+'\nGenius. Note completed - press any key to begin the next one.'+Style.RESET_ALL #@UndefinedVariable
        pause() # loop back to look at next note, unless we're at the end of the file
    # end of while loop that completes one note
    
    # end of while
    print 'You have finished importing '+filename+' !'
    