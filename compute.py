import pandas as pd
import numpy as np
import scipy
from scipy.optimize import curve_fit
import datetime as datetime



def natural_log(x, a, b):

    return a * np.log(x) + b


def compute_speed(duration, distance):
    return duration / distance * 1609

def hh_mm_ss_to_seconds(duration):
    hours, minutes, seconds = map(int, duration.split(":"))
    return hours *60*60 + minutes * 60 + seconds


def seconds_to_mm_ss(duration):
    minutes = duration // 60
    seconds = duration % 60
    return "{:2d}:{02d}".format(minutes, seconds)



def compute_speed(duration, distance):
    return duration / distance


def compute_coefs(durations, speeds):

    x = durations

    y = speeds

    popt, pcov = curve_fit(natural_log, x, y)
    a, b = popt

    return a, b


def compute_paces(a, b, pace):
    
    seconds = natural_log(pace, a, b)
    convert = str(datetime.timedelta(seconds = seconds))
    return(convert)


paces = {"easy_limit": 100000, "fast_easy": 20000, "steady_state": 9000, "long_run_finish": 6000, "tempo": 3600, "CV": 1800, "5k": 900, "3k": 600, "mile": 240, "800": 120}


durations = np.array([68.45, 635.91])
speeds = np.array([275.3, 341.1])


a, b = compute_coefs(durations, speeds)
print(f"Fitted equation: y = {a:.3f} * ln(x) + {b:.3f}")

print("Suggested easy limit:")
print(compute_suggested_pace(a, b, paces.get('easy_limit')))
