import os , sys   
import pandas as pd   
import json
import geopandas   as gpd   
import random




pd.set_option("display.max_rows"   , 1000000)
pd.set_option("display.max_columns", 1000000)


geom_file ="../json/wilaya_geometry.json"
excel_file="../json/zone_data.xlsx"

if not os.path.isfile (geom_file):
   print("Fichier polygone des wilaya manquant!" )
   sys.exit(1)

if not os.path.isfile(excel_file):
   print("Fichier des données Excel manquant!" )
   sys.exit(1)


with open(geom_file, "r") as gfile: gdata = json.load(gfile)

# Lire les données du fichier Excel
#Index(['Code', 'Wilaya', 'ﺎﻟﻭﻼﻳﺓ', 'Zone (indicative)', 'Libellé (liste)', 'NAE', 'NAG', 'TAE', 'TAG', 'TPG', 'TDG', 'Niveau (0-3)'],      dtype='object')
wdata = pd.read_excel(excel_file  )

code   =wdata["Code"].to_list()
name_fr=wdata["Wilaya"].to_list()
name_ar=wdata['الولاية'].to_list()
zone   =wdata["Zone (indicative)"].to_list()
label  =wdata["Libellé (liste)"].to_list()
nae    =wdata["NAE"].to_list()
nag    =wdata["NAG"].to_list()
tae    =wdata["TAE"].to_list()  
tag    =wdata["TAG"].to_list()
tpg    =wdata["TPG"].to_list()
tdg    =wdata["TDG"].to_list()
niv    =wdata["Niveau (0-3)"].to_list()


# Les polygones des wilayas  
geoms = gdata["features"]

# Dictionaire pour geopandas !
dict_zone={ "id"  :code , 
       "name_fr"  :name_fr, 
       "name_ar"  :name_ar,
       "zone"     :zone,
       "label"    :label, 
       "NAE"      :nae ,
       "NAG"      :nag ,
       "TAE"      :tae ,
       "TAG"      :tag ,
       "TPG"      :tpg ,
       "niveau"   :niv }


# Créer des  datafarmes  pour geopandas 
metadata_zone  = pd.DataFrame (dict_zone) 
polygones      = gpd.read_file(geom_file)


# "01" dans les métadonnées et 1 dans le GeoJSON deviennent la même clé.
#  Verifier que le polygone correpond au nom de la wilaya  
metadata_zone ["id"]  = pd.to_numeric(metadata_zone ["id"  ], errors="raise").astype("Int64")
polygones["code"]     = pd.to_numeric(polygones["code"], errors="raise").astype("Int64")

nwilaya=len(metadata_zone ["id"] )
expected_code  = set(range(1, nwilaya+1))
for source, codes in [("métadonnées", metadata_zone["id"]), ("polygones", polygones["code"])]: 
    missing = expected_code   - set(codes.dropna())
    if missing or len(codes) != nwilaya:
        raise ValueError( f"Dans les meta données 'ZONE' ,  {source} : {len(codes)} lignes, missing codes  = {sorted(missing)}")

# fusionner tout dans geo dataframe  et créer le fichier ZONE  ( comme dans le fichier EXCEL  ZONE.xlsx !! )
gdf_zone = polygones.merge(metadata_zone, left_on="code", right_on="id", validate="one_to_one")
#gdf_pec  = polygones.merge(metadata_pec , left_on="code", right_on="id", validate="one_to_one")


# Ecriture dans un fichier geojson avec la projection Lat/lon  4326 
# Equivalent à la feuille Excel "data"  
outfile="../json/data.geojson"
gdf_zone.to_crs(4326).to_file(outfile  , driver="GeoJSON", index=False)

if os.path.isfile(outfile):
   print( " ")
   print(f"Les données Excel sont écrites dans le fichier geojson : {outfile}")
else:
   print(f"Echec de la génération du fichier data.geojson")
   sys.exit(1) 

# Equivalent à PEC.xlsx
#gdf_pec.to_crs(4326).to_file("pec.geojson", driver="GeoJSON", index=False)











