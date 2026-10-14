---
title: "3D Printed World Map"
startDate: "2024-04"
endDate: "2024-05"
draft: true
images: [./3d-printed-world-map-1.jpg, ./3d-printed-world-map-2.jpg, ./3d-printed-world-map-3.jpg, ./3d-printed-world-map-4.jpg, ./3d-printed-world-map-5.jpg, ./3d-printed-world-map-6.jpg]
---

## Files can be found [here](https://www.printables.com/model/824371-low-poly-world-map-1-meter-version)
## Gcode modified
```gcode
{if plate_name!=""}{plate_name}{else}{input_filename_base}{endif}_{filament_type[initial_tool]}_{printer_model}_{print_time}_{round((total_weight*100.0))/(100.0)}g_${round((total_cost*100.0))/(100.0)}.gcode

```


## Prusa Mini Non-Cut Parts

| File Name            | Time   | Filament (meters) | Filament (grams) |
| -------------------- | ------ | ----------------- | ---------------- |
| **Africa2**          | 4h11m  | 18.94             | 56.49            |
| **Asia4**            | 4h37m  | 19.37             | 57.78            |
| **Asia Islands 1-4** | 1h39m  | 5.35              | 15.95            |
| **Small Prints**     | 1h45m  | 4.98              | 14.85            |
| **NorthPole**        | 1h26m  | 5.96              | 17.79            |
| **Australia**        | 3h19m  | 14.02             | 41.81            |
| **Asia1**            | 4h31m  | 21.30             | 63.71            |
| **Europe**           | 5h6m   | 18.77             | 56.00            |
| ***TOTAL***          | 26h34m | 108.69            | 324.38           |
<!-- TBLFM: @>$3=sum(@I..@-1) -->



## Prusa Mini Cut Parts

| File Name    | Time   | Filament (meters) | Filament (grams) |
| ------------ | ------ | ----------------- | ---------------- |
| **Africa1A** | 2h40m  | 12.00             | 35.86            |
| **Africa1B** | 3h32m  | 15.82             | 47.25            |
| **Asia2**    | 5h9m   | 20.69             | 61.70            |
| **Asia3**    | 6h4m   | 25.44             | 75.86            |
| **NA1A**     | 4h8m   | 17.12             | 51.05            |
| **NA1B**     | 2h25m  | 9.81              | 29.26            |
| **NA2 **     | 4h46m  | 18.41             | 54.92            |
| **SA1**      | 4h15m  | 16.51             | 49.24            |
| **SA2**      | 4h21m  | 18.04             | 53.80            |
| ***TOTAL***  | 37h20m | 153.84            | 458.94           |
<!-- TBLFM: @>$3=sum(@I..@-1) -->

## Total Statistics and Result

|      -      | Time   | Filament (meters) | Filament (grams) |
| :---------: | ------ | ----------------- | ---------------- |
| ***TOTAL*** | 63h54m | 262.53            | 783.32           |


See also: https://www.printables.com/model/824371-low-poly-world-map-1-meter-version/comments/1781329
