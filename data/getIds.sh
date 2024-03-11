# Define the main variables
BASE_URL_ASSETS=https://whatson-assets.vercel.app
BROWSER_PATH="/Applications/Arc.app"
FILMS_ASSETS_PATH=./src/assets/
FILMS_FIRST_INDEX_NUMBER=1
FILMS_MAX_NUMBER=15
PAGES_MAX_NUMBER=15
PAGES_MIN_NUMBER=1
PROMPT=$3
PROMPT_SERVICE_NAME=$4
SECONDS=0
SOURCE=$1
TEMP_URLS_FILE_PATH=./temp_urls
TYPE=$2
URL_ESCAPE_FILE_PATH=./data/urlEscape.sed
UPDATED_AT_FILE_PATH=./src/assets/updated_at.txt
USER_AGENT="$((RANDOM % 1000000000000))"
IMDB_ID_TO_CHECK=$5

# Define alternative base variables
if [[ $TYPE == "movie" ]]; then
  BASE_URL=https://www.allocine.fr/film/aucinema/
  FILMS_IDS_FILE_PATH=./src/assets/films_ids.txt
  FILMS_FILE_NAME=films_ids.txt
  POPULARITY_FILE_NAME=popularity_ids_films.txt
  FILMS_NUMBER_HREF=/film/fichefilm_gen_cfilm=
  TITLE_TYPE=feature,tv_movie,tv_special,documentary,short
  BETASERIES_TYPE=movies/movie
  JQ_COMMAND_TYPE=".movie.resource_url"
  JQ_COMMAND_TYPE_TMDB=".movie.themoviedb_id"
  JQ_COMMAND_RESULTS=".movie_results"
  PROPERTY=P1265
  METACRITIC_TYPE=movie
  POPULARITY_ASSETS_PATH=./src/assets/popularity_ids_films.txt
  SKIP_IDS_FILE_PATH=./src/assets/skip_ids_films.txt
else
  BASE_URL=https://www.allocine.fr/series/top/
  FILMS_IDS_FILE_PATH=./src/assets/series_ids.txt
  FILMS_FILE_NAME=series_ids.txt
  POPULARITY_FILE_NAME=popularity_ids_series.txt
  FILMS_NUMBER_HREF=/series/ficheserie_gen_cserie=
  TITLE_TYPE=tv_series,tv_episode,tv_special,tv_miniseries,documentary,tv_short
  BETASERIES_TYPE=shows/display
  JQ_COMMAND_TYPE=".show.resource_url"
  JQ_COMMAND_TYPE_TMDB=".show.themoviedb_id"
  JQ_COMMAND_RESULTS=".tv_results"
  PROPERTY=P1267
  METACRITIC_TYPE=tv
  POPULARITY_ASSETS_PATH=./src/assets/popularity_ids_series.txt
  SKIP_IDS_FILE_PATH=./src/assets/skip_ids_series.txt
fi

if [[ $SOURCE == "circleci" ]]; then
  curl -s "$BASE_URL_ASSETS/$FILMS_FILE_NAME" > $FILMS_IDS_FILE_PATH
  echo "Downloading $BASE_URL_ASSETS/$FILMS_FILE_NAME to $FILMS_IDS_FILE_PATH"

  sed -i "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH

  sed -i -E "s/(,TRUE|,FALSE){1,}/,FALSE/g" $FILMS_IDS_FILE_PATH
else
  sed -i '' "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH

  sed -i '' -E "s/(,TRUE|,FALSE){1,}/,FALSE/g" $FILMS_IDS_FILE_PATH
fi

REGEX_IDS="^/.*\=[0-9]+\.html,tt[0-9]+,(.+?)+,[0-9]+,(.+?)+,(.+?)+,(.+?)+,(.+?)+,(TRUE|FALSE)$"
WRONG_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS | wc -l | awk '{print $1}')
if [[ $WRONG_LINES_NB -gt 1 ]]; then
  echo "WRONG_LINES_NB / Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
  echo "details:"
  cat $FILMS_IDS_FILE_PATH | grep -E -v $REGEX_IDS
  exit 1
fi

DUPLICATES_LINES_NB=$(cat $FILMS_IDS_FILE_PATH | cut -d',' -f1 | uniq -cd && cat $FILMS_IDS_FILE_PATH | cut -d',' -f2 | sort | uniq -cd | awk '$1 > 3')
if [[ $DUPLICATES_LINES_NB ]]; then
  echo "DUPLICATES_LINES_NB / Something's wrong in the ids file: $FILMS_IDS_FILE_PATH"
  echo "details:"
  echo $DUPLICATES_LINES_NB
  exit 1
fi

# Loading the env variables
if [[ $SOURCE != "circleci" ]]; then
  source .env
fi
echo "SOURCE: $SOURCE"
echo "BETASERIES_API_KEY: $BETASERIES_API_KEY"
echo "THEMOVIEDB_API_KEY: $THEMOVIEDB_API_KEY"
echo "VERCEL_ORG_ID: $VERCEL_ORG_ID"
echo "VERCEL_PROJECT_ID: $VERCEL_PROJECT_ID"
echo "VERCEL_TOKEN: $VERCEL_TOKEN"
echo "----------------------------------------------------------------------------------------------------"
if [[ -z $BETASERIES_API_KEY ]]; then
  exit 1
fi

# Sorting the ids in the file and removing duplicates.
sort_ids () {
  cat $FILMS_IDS_FILE_PATH | sort -V | uniq > ./temp_ids.txt
  cat ./temp_ids.txt > $FILMS_IDS_FILE_PATH
}

# A function that removes temporary files.
remove_files () {
  sort_ids

  rm -f ./temp_*
  rm -f src/assets/.!*!films_ids.txt
  rm -f src/assets/.!*!series_ids.txt

  if [[ $SOURCE == "circleci" ]]; then
    sed -i "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH
  else
    sed -i '' "/noTheMovieDBId/d" $FILMS_IDS_FILE_PATH
  fi
}

# A function that is called when the data is not found.
data_not_found () {
  IMDB_ID=null
  BETASERIES_ID=null
  THEMOVIEDB_ID="noTheMovieDBId"

  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ❌"
}

betaseries_to_null () {
  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ❌"
}

# A function that is called when the data is found.
data_found () {
  echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID"
  echo "page: $PAGES_INDEX_NUMBER/$PAGES_NUMBER - item: $FILMS_INDEX_NUMBER/$FILMS_NUMBER - title: $TITLE ✅"
}

get_other_ids () {
  METACRITIC_ID=$(curl -s $WIKI_URL | grep "https://www.metacritic.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  METACRITIC_ID_DEPRECATED=$(curl -s $WIKI_URL | grep -A15 "https://www.metacritic.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ $PROMPT == "recheck" ]] && [[ $PROMPT_SERVICE_NAME == "metacritic" ]]; then
    open -a $BROWSER_PATH "https://www.allocine.fr$URL"
    open -a $BROWSER_PATH "https://www.metacritic.com"
    echo "Enter the Metacritic ID:"
    read METACRITIC_ID
  elif [[ -z $METACRITIC_ID ]] || [[ $METACRITIC_ID_DEPRECATED -eq 1 ]]; then
    METACRITIC_ID=null
  fi
  echo "Metacritic ID: $METACRITIC_ID"

  ROTTEN_TOMATOES_ID=$(curl -s $WIKI_URL | grep "https://www.rottentomatoes.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  ROTTEN_TOMATOES_ID_DEPRECATED=$(curl -s $WIKI_URL | grep -A15 "https://www.rottentomatoes.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ $PROMPT == "recheck" ]] && [[ $PROMPT_SERVICE_NAME == "rottentomatoes" ]]; then
    open -a $BROWSER_PATH "https://www.allocine.fr$URL"
    open -a $BROWSER_PATH "https://www.rottentomatoes.com"
    echo "Enter the Rotten Tomatoes ID:"
    read ROTTEN_TOMATOES_ID
  elif [[ -z $ROTTEN_TOMATOES_ID ]] || [[ $ROTTEN_TOMATOES_ID_DEPRECATED -eq 1 ]]; then
    ROTTEN_TOMATOES_ID=null
  fi
  echo "Rotten Tomatoes ID: $ROTTEN_TOMATOES_ID"

  LETTERBOXD_ID=$(curl -s $WIKI_URL | grep "https://letterboxd.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  LETTERBOXD_ID_DEPRECATED=$(curl -s $WIKI_URL | grep -A15 "https://letterboxd.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ $PROMPT == "recheck" ]] && [[ $PROMPT_SERVICE_NAME == "letterboxd" ]]; then
    open -a $BROWSER_PATH "https://www.allocine.fr$URL"
    open -a $BROWSER_PATH "https://letterboxd.com"
    echo "Enter the Letterboxd ID:"
    read LETTERBOXD_ID
  elif [[ -z $LETTERBOXD_ID ]] || [[ $LETTERBOXD_ID_DEPRECATED -eq 1 ]]; then
    LETTERBOXD_ID=null
  fi
  echo "Letterboxd ID: $LETTERBOXD_ID"

  SENSCRITIQUE_ID=$(curl -s $WIKI_URL | grep "https://www.senscritique.com" | head -1 | cut -d'>' -f3 | cut -d'<' -f1 | cut -d'/' -f2)
  SENSCRITIQUE_ID_DEPRECATED=$(curl -s $WIKI_URL | grep -A15 "https://www.senscritique.com" | grep "Q21441764" | wc -l | awk '{print $1}')
  if [[ $PROMPT == "recheck" ]] && [[ $PROMPT_SERVICE_NAME == "senscritique" ]]; then
    if [[ -z $IMDB_ID_TO_CHECK ]] || [[ $IMDB_ID_TO_CHECK == $IMDB_ID ]]; then
      open -a $BROWSER_PATH "https://www.allocine.fr$URL"
      open -a $BROWSER_PATH "https://www.senscritique.com"
      echo "Enter the SensCritique ID:"
      read SENSCRITIQUE_ID
    else
      SENSCRITIQUE_ID=null
    fi
  elif [[ -z $SENSCRITIQUE_ID ]] || [[ $SENSCRITIQUE_ID_DEPRECATED -eq 1 ]]; then
    SENSCRITIQUE_ID=null
  fi
  echo "SensCritique ID: $SENSCRITIQUE_ID"
}

remove_files

rm -f $POPULARITY_ASSETS_PATH

curl -s -H "User-Agent: $USER_AGENT" $BASE_URL > temp_baseurl

# Get AlloCiné baseUrl number
FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | wc -l | awk '{print $1}')
if [[ $FILMS_NUMBER -gt 15 ]]; then
  FILMS_NUMBER=$FILMS_MAX_NUMBER
fi

if [[ $FILMS_NUMBER -lt 15 ]]; then
  # Define AlloCiné baseUrl pages number to 1
  PAGES_NUMBER=1
else
  # Define AlloCiné baseUrl pages number
  PAGES_NUMBER=$(cat temp_baseurl | grep -Eo "\">[0-9]+</a></div></nav>" | cut -d'>' -f2 | cut -d'<' -f1)
  if [[ $PAGES_NUMBER -gt 15 ]]; then
    PAGES_NUMBER=$PAGES_MAX_NUMBER
  fi
fi

# Loop through all AlloCiné pages
for PAGES_INDEX_NUMBER in $( eval echo {$PAGES_MIN_NUMBER..$PAGES_NUMBER} )
do
  # Get AlloCiné first page
  if [[ $PAGES_INDEX_NUMBER -eq 1 ]]; then
    FILM_ID=1

    echo "Downloading from: $BASE_URL"

  # Get AlloCiné second until second to last page
  elif [[ $PAGES_INDEX_NUMBER -lt $PAGES_NUMBER ]]; then
    curl -s $BASE_URL\?page\=$PAGES_INDEX_NUMBER > temp_baseurl

    echo "Downloading from: $BASE_URL?page=$PAGES_INDEX_NUMBER"

  # Get AlloCiné last page
  elif [[ $PAGES_INDEX_NUMBER -eq $PAGES_NUMBER ]]; then
    curl -s $BASE_URL\?page\=$PAGES_INDEX_NUMBER > temp_baseurl

    echo "Downloading from: $BASE_URL?page=$PAGES_INDEX_NUMBER"

    FILMS_NUMBER=$(cat temp_baseurl | grep "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | wc -l | awk '{print $1}')
    if [[ $FILMS_NUMBER -gt 15 ]]; then
      FILMS_NUMBER=$FILMS_MAX_NUMBER
    fi
  fi

  FILMS_INDEX_NUMBER=$FILMS_FIRST_INDEX_NUMBER
  while [[ $FILMS_INDEX_NUMBER -le $FILMS_NUMBER ]]
  do
    # Get AlloCiné film url
    URL=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | tail -1 | head -1 | cut -d'"' -f4)

    # Sometimes AlloCiné is displaying a default top series list starting by this ID. If `true`, abording.
    if [[ $URL == "/series/ficheserie_gen_cserie=28295.html" ]] && [[ $PAGES_INDEX_NUMBER -eq 1 ]] && [[ $FILMS_INDEX_NUMBER -eq 1 ]]; then
      echo "First URL is: $URL"
      echo "Not updating tvshows as the top list is not correct."

      curl -s "$BASE_URL_ASSETS/$POPULARITY_FILE_NAME" > $POPULARITY_ASSETS_PATH

      exit 1
    fi

    # Get id
    FILM_ID=$(cat temp_baseurl | grep -m$FILMS_INDEX_NUMBER "<a class=\"meta-title-link\" href=\"$FILMS_NUMBER_HREF" | tail -1 | head -1 | cut -d'"' -f4 | cut -d'=' -f2 | cut -d'.' -f1)

    # Check if missing shows
    ALLOCINE_URL=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f1)

    if [[ $URL == $ALLOCINE_URL ]]; then
      if [[ $SOURCE == "circleci" ]]; then
        sed -i "/.*=$FILM_ID\.html.*$/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
      else
        sed -i '' "/.*=$FILM_ID\.html.*$/ s/,FALSE$/,TRUE/" $FILMS_IDS_FILE_PATH
      fi
      cat $FILMS_IDS_FILE_PATH | grep ".*=$FILM_ID\.html"

      MATCH_NUMBER=$(cat $FILMS_IDS_FILE_PATH | grep ".*=$FILM_ID\.html" | wc -l | awk '{print $1}')
      if [[ $MATCH_NUMBER != 1 ]]; then
        exit 1
      fi

      FOUND=1
    else
      FOUND=0
    fi

    INDEX_POPULARITY=$[$INDEX_POPULARITY+1]

    # Get Allociné popularity number
    POPULARITY_NUMBER=$INDEX_POPULARITY
    echo "$POPULARITY_NUMBER,$ALLOCINE_URL" >> $POPULARITY_ASSETS_PATH

    # Add first line to URLs check file
    echo "first line" >> $TEMP_URLS_FILE_PATH

    IMDB_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f2)
    BETASERIES_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f3)
    METACRITIC_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f5)
    ROTTEN_TOMATOES_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f6)
    LETTERBOXD_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f7)
    SENSCRITIQUE_CHECK=$(cat $FILMS_IDS_FILE_PATH | grep $URL | cut -d',' -f8)

    if [[ $FOUND -eq 0 ]] || [[ $PROMPT == "recheck" ]]; then
      URL_FILE=$TEMP_URLS_FILE_PATH
      while IFS= read -r TEMP_URLS <&3; do
        if [[ $URL == $TEMP_URLS ]]; then
          DUPLICATE=1
          break
        else
          DUPLICATE=0
        fi
      done 3<$URL_FILE

      echo $URL >> $TEMP_URLS_FILE_PATH

      if [[ $PROMPT == "recheck" ]]; then
        if { [[ $IMDB_CHECK == "null" ]] && [[ $PROMPT_SERVICE_NAME == "imdb" ]]; } ||
          { [[ $BETASERIES_CHECK == "null" ]] && [[ $PROMPT_SERVICE_NAME == "betaseries" ]]; } ||
          { [[ $METACRITIC_CHECK == "null" ]] && [[ $PROMPT_SERVICE_NAME == "metacritic" ]]; } ||
          { [[ $ROTTEN_TOMATOES_CHECK == "null" ]] && [[ $PROMPT_SERVICE_NAME == "rottentomatoes" ]]; } ||
          { [[ $LETTERBOXD_CHECK == "null" ]] && [[ $PROMPT_SERVICE_NAME == "letterboxd" ]]; } ||
          { [[ $SENSCRITIQUE_CHECK == "null" ]] && [[ $PROMPT_SERVICE_NAME == "senscritique" ]]; }; then
          DUPLICATE=0
          echo "Found $URL to be rechecked."
        else
          DUPLICATE=1
        fi
      fi

      if [[ $DUPLICATE -eq 0 ]]; then
        curl -s https://www.allocine.fr$URL > temp_allocine_url
        echo "Downloading from: https://www.allocine.fr$URL"
        if [[ -z $URL ]]; then
          echo "No URL has been found! Script aborded."
          exit 1
        fi

        # Get title
        TITLE=$(cat temp_allocine_url | grep -m1 "<meta property=\"og:title\" content=\"" | cut -d'"' -f4 | sed 's/&#039;/'"'"'/' | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')
        echo "Title: $TITLE"

        # Get original title for IMDb
        ORIGINAL_TITLE=$(cat temp_allocine_url | grep -A1 "Titre original" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/&#039;/'"'"'/' | sed 's/\&amp;/\&/g' | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')
        ORIGINAL_TITLE_NUMBER=$(cat temp_allocine_url | grep -A1 "Titre original" | tail -1 | cut -d'>' -f2 | cut -d'<' -f1 | wc -l | awk '{print $1}')
        if [[ $ORIGINAL_TITLE_NUMBER -gt 0 ]]; then
          TITLE=$ORIGINAL_TITLE
        fi

        # Get title encoded characters URL
        TITLE_URL_ENCODED=$(echo $TITLE | tr '[:upper:]' '[:lower:]' | sed -f $URL_ESCAPE_FILE_PATH)

        WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3A$PROPERTY%20%22$FILM_ID%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
        if [[ -z $WIKI_URL ]]; then
          if [[ $PROMPT == "recheck" ]] && [[ $IMDB_CHECK ]]; then
            IMDB_ID=$IMDB_CHECK
            METACRITIC_ID=$METACRITIC_CHECK
            ROTTEN_TOMATOES_ID=$ROTTEN_TOMATOES_CHECK
            LETTERBOXD_ID=$LETTERBOXD_CHECK
            SENSCRITIQUE_ID=$SENSCRITIQUE_CHECK
          else
            IMDB_ID=null
            METACRITIC_ID=null
            ROTTEN_TOMATOES_ID=null
            LETTERBOXD_ID=null
            SENSCRITIQUE_ID=null
          fi
        else
          echo "wikiUrl: $WIKI_URL"

          IMDB_ID=$(curl -s $WIKI_URL | grep "https://wikidata-externalid-url.toolforge.org/?p=345" | grep -Eo "tt[0-9]+" | head -1)
          if [[ -z $IMDB_ID ]]; then
            IMDB_ID=null
          fi
          echo "IMDb ID: $IMDB_ID"

          get_other_ids
        fi

        if [[ $METACRITIC_ID == "null" ]] && [[ $ROTTEN_TOMATOES_ID == "null" ]] && [[ $LETTERBOXD_ID == "null" ]] && [[ $SENSCRITIQUE_ID == "null" ]]; then
          WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP345%20%22$IMDB_ID%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
          if [[ $WIKI_URL ]]; then
            get_other_ids
          fi
        fi

        if [[ $IMDB_ID == "null" ]] && [[ $PROMPT == "stop" ]] && [[ $PROMPT_SERVICE_NAME == "imdb" ]]; then
          TRUES=$(cat $SKIP_IDS_FILE_PATH | grep "TRUE,TRUE,TRUE," | wc -l | awk '{print $1}')
          if [ $TRUES -gt 0 ]; then
              sed -i '' '/TRUE/!d' $SKIP_IDS_FILE_PATH
          fi

          MATCH_SKIP_NUMBER=$(cat $SKIP_IDS_FILE_PATH | grep ".*=$FILM_ID\.html" | wc -l | awk '{print $1}')
          if [[ $MATCH_SKIP_NUMBER -eq 1 ]]; then
            echo "ID: $FILM_ID skipped."
            sed -i '' "/.*=$FILM_ID\.html.*/ s/$/TRUE,/" $SKIP_IDS_FILE_PATH
            SKIP=1
          else
            SKIP=0
          fi

          if [[ $SKIP -eq 0 ]]; then
            open -a $BROWSER_PATH "https://www.allocine.fr$URL"
            open -a $BROWSER_PATH "https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"
            echo "Enter the IMDb ID:"
            read IMDB_ID

            if [[ $IMDB_ID == "skip" ]]; then
              echo $URL, >> $SKIP_IDS_FILE_PATH
              IMDB_ID=null
            else
              WIKI_URL=$(curl -s https://query.wikidata.org/sparql\?query\=SELECT%20%3Fitem%20%3FitemLabel%20WHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP345%20%22$IMDB_ID%22%0A%7D | grep "uri" | cut -d'>' -f2 | cut -d'<' -f1 | sed 's/http/https/' | sed 's/entity/wiki/')
              if [[ $WIKI_URL ]]; then
                get_other_ids
              fi
            fi
          else
            IMDB_ID=null
          fi
        fi

        if [[ $IMDB_ID == "null" ]] && [[ -z $PROMPT ]]; then
          data_not_found
        else
          if [[ $IMDB_ID == "null" ]] && [[ $PROMPT == "recheck" ]]; then
            open -a $BROWSER_PATH "https://www.allocine.fr$URL"
            open -a $BROWSER_PATH "https://www.imdb.com/search/title/?title=$TITLE_URL_ENCODED&title_type=$TITLE_TYPE"
            echo "Enter the IMDb ID:"
            read IMDB_ID
          fi

          echo "imdbId URL: https://www.imdb.com/title/$IMDB_ID/"

          BETASERIES_ID=$(curl -s https://api.betaseries.com/$BETASERIES_TYPE\?key\=$BETASERIES_API_KEY\&imdb_id\=$IMDB_ID | jq "$JQ_COMMAND_TYPE" | cut -d'/' -f5 | sed 's/"//g')
          echo "Downloading from: https://api.betaseries.com/$BETASERIES_TYPE?key=$BETASERIES_API_KEY&imdb_id=$IMDB_ID"
          echo "Betaseries ID: $BETASERIES_ID"

          if [[ $BETASERIES_ID == "null" ]] && [[ $PROMPT == "recheck" ]]; then
            open -a $BROWSER_PATH "https://www.allocine.fr$URL"
            open -a $BROWSER_PATH "https://betaseries.com"
            echo "Enter the Betaseries ID:"
            read BETASERIES_ID
          fi

          THEMOVIEDB_ID=$(curl -s https://api.themoviedb.org/3/find/$IMDB_ID\?api_key=$THEMOVIEDB_API_KEY\&external_source=imdb_id | jq "$JQ_COMMAND_RESULTS" | jq '.[] .id')
          echo "Downloading from: https://api.themoviedb.org/3/find/$IMDB_ID?api_key=$THEMOVIEDB_API_KEY&external_source=imdb_id"

          if [[ -z $THEMOVIEDB_ID ]]; then
            THEMOVIEDB_ID=$(curl -s https://api.betaseries.com/$BETASERIES_TYPE\?key\=$BETASERIES_API_KEY\&imdb_id\=$IMDB_ID | jq "$JQ_COMMAND_TYPE_TMDB")
            echo "Downloading from: https://api.betaseries.com/$BETASERIES_TYPE?key=$BETASERIES_API_KEY&imdb_id=$IMDB_ID"
            echo "The Movie Database ID: $THEMOVIEDB_ID"
          fi

          if [[ -z $THEMOVIEDB_ID ]] || [[ $THEMOVIEDB_ID == "null" ]]; then
            if [[ $PROMPT == "recheck" ]]; then
              open -a $BROWSER_PATH "https://www.themoviedb.org/search/trending?query=$TITLE_URL_ENCODED"
              echo "Enter the The Movie Database ID:"
              read THEMOVIEDB_ID
            else
              data_not_found
            fi
          elif [[ $BETASERIES_ID == "null" ]]; then
            betaseries_to_null
          else
            data_found
          fi
        fi

        echo "$URL,$IMDB_ID,$BETASERIES_ID,$THEMOVIEDB_ID,$METACRITIC_ID,$ROTTEN_TOMATOES_ID,$LETTERBOXD_ID,$SENSCRITIQUE_ID,TRUE" >> $FILMS_IDS_FILE_PATH

        echo "----------------------------------------------------------------------------------------------------"

        count=$(grep -c '^'"$URL"',*' $FILMS_IDS_FILE_PATH)
        if [[ $count -gt 1 ]] && [[ $PROMPT == "recheck" ]]; then
            echo "Number of lines found for $URL: $count"

            grep '^'"$URL"',*' $FILMS_IDS_FILE_PATH

            if [[ $SENSCRITIQUE_ID == "null" ]]; then
              LINE_NUMBER_TO_REMOVE=2
            elif [[ $SENSCRITIQUE_ID != "null" ]]; then
              LINE_NUMBER_TO_REMOVE=1
            else
              echo "Which line to remove?"
              read LINE_NUMBER_TO_REMOVE
            fi

            if [[ $LINE_NUMBER_TO_REMOVE == "1" ]] || [[ $LINE_NUMBER_TO_REMOVE == "first" ]]; then
              awk '!flag && /.*='"$FILM_ID"'\.html.*$/ {flag=1; next} 1' $FILMS_IDS_FILE_PATH > temp_sed && mv temp_sed $FILMS_IDS_FILE_PATH
              echo "First match removed."
            else
              sed -i '' -e '$ d' $FILMS_IDS_FILE_PATH
              echo "Last line removed."
            fi

            new_count=$(grep -c '^'"$URL"',*' $FILMS_IDS_FILE_PATH)
            echo "Number of lines found for $URL: $new_count"
        fi
      fi
    fi

    FILMS_INDEX_NUMBER=$[$FILMS_INDEX_NUMBER+1] FILM_ID=$[$FILM_ID+1]
  done
done

remove_files

DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "Last update was on: $DATE"
echo $DATE > $UPDATED_AT_FILE_PATH

cd $FILMS_ASSETS_PATH
vercel --prod --token=$VERCEL_TOKEN
echo "Uploading $FILMS_ASSETS_PATH to $BASE_URL_ASSETS"

# Add ending message with duration
DATA_DURATION=$SECONDS
echo "Complete in $(($DATA_DURATION / 60)) minutes and $(($DATA_DURATION % 60)) seconds ✅"
echo "----------------------------------------------------------------------------------------------------"